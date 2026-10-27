package legajo

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// fecha formatea una fecha de la base como YYYY-MM-DD, o vacio si es nula.
func fecha(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

// Repositorio lee y escribe el legajo.
type Repositorio struct{ pool *db.Pool }

func NuevoRepositorio(pool *db.Pool) *Repositorio { return &Repositorio{pool: pool} }

// consultador es lo comun a un pool y a una transaccion.
type consultador interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// columnasEscuela incluye los derivados (research D10): se calculan en la
// misma consulta, nunca se guardan.
const columnasEscuela = `e.id, e.numero, e.nombre, e.departamento, e.ambito, e.zona, e.inspector,
	e.direccion, e.telefono, e.email, e.director, e.cocinera_responsable, e.modalidad,
	e.comensales_alumnos, e.comensales_personal, e.servicio_desayuno, e.servicio_almuerzo,
	e.servicio_merienda, e.agua_ose, e.rubro_agua, e.notas_agua, e.programa_leche, e.leche_kg,
	e.notas_leche, e.notas, e.proveedores, e.tipo, e.activo, e.version,
	(SELECT max(v.fecha) FROM visitas v WHERE v.escuela_id = e.id AND v.estado = 'Realizada'),
	(SELECT count(*) FROM visitas v WHERE v.escuela_id = e.id AND v.estado = 'Realizada'),
	(SELECT count(*) FROM incidencias i WHERE i.escuela_id = e.id AND i.estado <> 'Resuelto')`

func escanearEscuela(f pgx.Row) (School, error) {
	var s School
	var ultima *time.Time
	err := f.Scan(&s.ID, &s.Number, &s.Name, &s.Department, &s.AreaType, &s.Zone, &s.AssignedInspector,
		&s.Address, &s.Phone, &s.Email, &s.PrincipalName, &s.HeadCookName, &s.Modality,
		&s.StudentDinersCount, &s.StaffDinersCount, &s.MealServices.Breakfast, &s.MealServices.Lunch,
		&s.MealServices.Snack, &s.HasWaterSupply, &s.WaterPurchaseAllowance, &s.WaterNotes,
		&s.MilkProgramType, &s.MilkPowderKg, &s.MilkNotes, &s.Notes, &s.Providers, &s.SchoolType, &s.Active, &s.Version,
		&ultima, &s.TotalVisits, &s.ActiveIssuesCount)
	s.LastVisitDate = fecha(ultima)
	return s, err
}

const columnasPersonal = `id, escuela_id, nombre_completo, ci, rol, regimen, empresa,
	vence_carne_salud, vence_carne_manipulador, bps, telefono, notas, activo, version`

func escanearPersonal(f pgx.Row) (StaffMember, error) {
	var p StaffMember
	var salud, manip *time.Time
	err := f.Scan(&p.ID, &p.SchoolID, &p.FullName, &p.CI, &p.Role, &p.InstitutionType, &p.EnterpriseName,
		&salud, &manip, &p.SocialSecurityStatus, &p.Phone, &p.Notes, &p.Active, &p.Version)
	p.HealthCardValidUntil, p.FoodHandlerCardValidUntil = fecha(salud), fecha(manip)
	return p, err
}

const columnasVisita = `id, escuela_id, numero, fecha, hora, estado, visitantes,
	comensales_reales, evaluacion_menu, contenido, version`

func escanearVisita(f pgx.Row) (Visit, error) {
	var v Visit
	var dia time.Time
	var contenido []byte
	if err := f.Scan(&v.ID, &v.SchoolID, &v.VisitNumber, &dia, &v.Time, &v.Status, &v.Visitors,
		&v.DinersActualCount, &v.MenuEvaluation, &contenido, &v.Version); err != nil {
		return v, err
	}
	v.Date = fecha(&dia)
	if v.Visitors == nil {
		v.Visitors = []string{}
	}
	if err := json.Unmarshal(contenido, &v.VisitaContenido); err != nil {
		return v, err
	}
	if v.UnauthorizedItemsList == nil {
		v.UnauthorizedItemsList = []UnauthorizedItem{}
	}
	return v, nil
}

const columnasIncidencia = `id, escuela_id, COALESCE(visita_id, ''), titulo, descripcion, categoria,
	severidad, fecha_reporte, estado, fecha_resolucion, notas_resolucion, resuelta_en_visita, version`

func escanearIncidencia(f pgx.Row) (SchoolIssue, error) {
	var i SchoolIssue
	var reporte time.Time
	var resuelta *time.Time
	err := f.Scan(&i.ID, &i.SchoolID, &i.VisitID, &i.Title, &i.Description, &i.Category, &i.Severity,
		&reporte, &i.Status, &resuelta, &i.ResolutionNotes, &i.ResolvedInVisitNumber, &i.Version)
	i.ReportedDate, i.ResolvedDate = fecha(&reporte), fecha(resuelta)
	return i, err
}

const columnasBitacora = `id, momento, COALESCE(escuela_id, ''), escuela_numero, escuela_nombre,
	COALESCE(cuenta_id, ''), autor_nombre, autor_rol, accion, categoria, etiqueta, etiquetas,
	resumen, detalle, notas, importada`

func escanearBitacora(f pgx.Row) (ActivityLog, error) {
	var l ActivityLog
	var momento time.Time
	var detalle []byte
	if err := f.Scan(&l.ID, &momento, &l.SchoolID, &l.SchoolNumber, &l.SchoolName, &l.UserID,
		&l.UserName, &l.UserRole, &l.ActionType, &l.Category, &l.EventTag, &l.Tags,
		&l.Summary, &detalle, &l.Notes, &l.Imported); err != nil {
		return l, err
	}
	l.Timestamp = momento.UTC().Format(time.RFC3339Nano)
	if l.Tags == nil {
		l.Tags = []string{}
	}
	if err := json.Unmarshal(detalle, &l.Details); err != nil {
		return l, err
	}
	if l.Details == nil {
		l.Details = []ActivityChangeDetail{}
	}
	return l, nil
}

// listar corre una consulta y escanea cada fila.
func listar[T any](ctx context.Context, q consultador, sql string, esc func(pgx.Row) (T, error), args ...any) ([]T, error) {
	filas, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer filas.Close()
	out := []T{}
	for filas.Next() {
		v, err := esc(filas)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, filas.Err()
}

// Leer arma el legajo completo (research D13). Con incluirInactivos=false se
// omiten escuelas y personal dados de baja; las visitas, incidencias y la
// bitacora van siempre, aunque su escuela este inactiva (FR-015).
func (r *Repositorio) Leer(ctx context.Context, incluirInactivos bool) (*Legajo, error) {
	var l Legajo
	var err error
	// Una transaccion de solo lectura repetible: las cinco consultas ven el
	// mismo instante, y los contadores no pueden contradecir a las listas.
	err = pgx.BeginTxFunc(ctx, r.pool, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly},
		func(tx pgx.Tx) error {
			if l.Schools, err = listar(ctx, tx, `SELECT `+columnasEscuela+` FROM escuelas e
				WHERE e.activo OR $1 ORDER BY e.numero`, escanearEscuela, incluirInactivos); err != nil {
				return err
			}
			if l.Staff, err = listar(ctx, tx, `SELECT `+columnasPersonal+` FROM personal
				WHERE activo OR $1 ORDER BY nombre_completo`, escanearPersonal, incluirInactivos); err != nil {
				return err
			}
			if l.Visits, err = listar(ctx, tx, `SELECT `+columnasVisita+` FROM visitas
				ORDER BY fecha DESC, numero DESC`, escanearVisita); err != nil {
				return err
			}
			if l.Issues, err = listar(ctx, tx, `SELECT `+columnasIncidencia+` FROM incidencias
				ORDER BY fecha_reporte DESC`, escanearIncidencia); err != nil {
				return err
			}
			if l.ActivityLogs, err = listar(ctx, tx, `SELECT `+columnasBitacora+` FROM bitacora
				ORDER BY momento DESC`, escanearBitacora); err != nil {
				return err
			}
			l.Cuentas, err = listar(ctx, tx, `SELECT id, usuario, nombre, rol FROM cuentas
				WHERE activa ORDER BY nombre`, func(f pgx.Row) (CuentaPublica, error) {
				var c CuentaPublica
				return c, f.Scan(&c.ID, &c.Usuario, &c.Nombre, &c.Rol)
			})
			return err
		})
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// Handlers atiende las rutas del legajo.
type Handlers struct{ repo *Repositorio }

func NuevosHandlers(repo *Repositorio) *Handlers { return &Handlers{repo: repo} }

// GetLegajo responde GET /legajo.
func (h *Handlers) GetLegajo(w http.ResponseWriter, r *http.Request) {
	l, err := h.repo.Leer(r.Context(), r.URL.Query().Get("incluir_inactivos") == "1")
	if err != nil {
		httpx.ErrorInterno(w, "leyendo el legajo", err)
		return
	}
	httpx.JSON(w, http.StatusOK, l)
}
