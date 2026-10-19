package importacion

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/db"
)

// ErrBaseConDatos: la base ya tiene legajo y no se pidio -agregar (FR-022).
var ErrBaseConDatos = errors.New("la base ya tiene escuelas cargadas; usá -agregar si de verdad querés sumar datos")

// Conteos es el informe de lo cargado.
type Conteos struct {
	Escuelas, Personal, Visitas, Incidencias, Bitacora int
}

func (c Conteos) String() string {
	return fmt.Sprintf("escuelas %d · personal %d · visitas %d · incidencias %d · bitácora %d",
		c.Escuelas, c.Personal, c.Visitas, c.Incidencias, c.Bitacora)
}

// LeerExistentes junta lo que ya hay en la base y las cuentas (usuario → id).
func LeerExistentes(ctx context.Context, pool *db.Pool) (Existentes, map[string]string, error) {
	ex := Existentes{NumerosVisita: map[string]int{}}
	conjuntoDe := func(sql string) (map[string]bool, error) {
		filas, err := pool.Query(ctx, sql)
		if err != nil {
			return nil, err
		}
		defer filas.Close()
		m := map[string]bool{}
		for filas.Next() {
			var s string
			if err := filas.Scan(&s); err != nil {
				return nil, err
			}
			m[s] = true
		}
		return m, filas.Err()
	}
	var err error
	for destino, sql := range map[*map[string]bool]string{
		&ex.Escuelas:       `SELECT id FROM escuelas`,
		&ex.NumerosEscuela: `SELECT numero::text FROM escuelas`,
		&ex.Personal:       `SELECT id FROM personal`,
		&ex.Visitas:        `SELECT id FROM visitas`,
		&ex.Incidencias:    `SELECT id FROM incidencias`,
		&ex.Bitacora:       `SELECT id FROM bitacora`,
	} {
		if *destino, err = conjuntoDe(sql); err != nil {
			return ex, nil, err
		}
	}
	filas, err := pool.Query(ctx, `SELECT escuela_id, max(numero) FROM visitas GROUP BY escuela_id`)
	if err != nil {
		return ex, nil, err
	}
	for filas.Next() {
		var esc string
		var n int
		if err := filas.Scan(&esc, &n); err != nil {
			filas.Close()
			return ex, nil, err
		}
		ex.NumerosVisita[esc] = n
	}
	filas.Close()

	cuentas := map[string]string{}
	filas, err = pool.Query(ctx, `SELECT usuario, id FROM cuentas`)
	if err != nil {
		return ex, nil, err
	}
	defer filas.Close()
	for filas.Next() {
		var u, id string
		if err := filas.Scan(&u, &id); err != nil {
			return ex, nil, err
		}
		cuentas[u] = id
	}
	return ex, cuentas, filas.Err()
}

func nulo(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// Cargar escribe el plan en UNA transaccion. Con agregar=false se niega si ya
// hay escuelas. Deja una entrada de bitacora IMPORT con los conteos.
func Cargar(ctx context.Context, pool *db.Pool, plan *Plan, archivo string, agregar bool) (Conteos, error) {
	var c Conteos
	err := pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		var hay bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM escuelas)`).Scan(&hay); err != nil {
			return err
		}
		if hay && !agregar {
			return ErrBaseConDatos
		}
		hoy := time.Now().Format("2006-01-02")

		for _, s := range plan.Escuelas {
			if _, err := tx.Exec(ctx, `INSERT INTO escuelas (id, numero, nombre, departamento, ambito, zona,
				inspector, direccion, telefono, email, director, cocinera_responsable, modalidad,
				comensales_alumnos, comensales_personal, servicio_desayuno, servicio_almuerzo,
				servicio_merienda, agua_ose, rubro_agua, notas_agua, programa_leche, leche_kg, notas_leche, notas)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
				s.ID, s.Number, s.Name, s.Department, s.AreaType, s.Zone, s.AssignedInspector, s.Address, s.Phone,
				s.Email, s.PrincipalName, s.HeadCookName, s.Modality, s.StudentDinersCount, s.StaffDinersCount,
				s.MealServices.Breakfast, s.MealServices.Lunch, s.MealServices.Snack, s.HasWaterSupply,
				s.WaterPurchaseAllowance, s.WaterNotes, s.MilkProgramType, s.MilkPowderKg, s.MilkNotes, s.Notes); err != nil {
				return fmt.Errorf("escuela %s: %w", s.ID, err)
			}
			c.Escuelas++
		}
		for _, p := range plan.Personal {
			if _, err := tx.Exec(ctx, `INSERT INTO personal (id, escuela_id, nombre_completo, ci, rol, regimen,
				empresa, vence_carne_salud, vence_carne_manipulador, bps, telefono, notas, activo)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
				p.ID, p.SchoolID, p.FullName, p.CI, p.Role, p.InstitutionType, p.EnterpriseName,
				nulo(p.HealthCardValidUntil), nulo(p.FoodHandlerCardValidUntil), p.SocialSecurityStatus,
				p.Phone, p.Notes, p.Active); err != nil {
				return fmt.Errorf("personal %s: %w", p.ID, err)
			}
			if _, err := tx.Exec(ctx, `INSERT INTO personal_asignaciones (personal_id, escuela_id, desde)
				VALUES ($1, $2, $3)`, p.ID, p.SchoolID, hoy); err != nil {
				return err
			}
			c.Personal++
		}
		for _, v := range plan.Visitas {
			contenido, err := json.Marshal(v.VisitaContenido)
			if err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO visitas (id, escuela_id, numero, fecha, hora, estado,
				visitantes, comensales_reales, evaluacion_menu, contenido)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				v.ID, v.SchoolID, v.VisitNumber, v.Date, v.Time, v.Status, v.Visitors, v.DinersActualCount,
				v.MenuEvaluation, contenido); err != nil {
				return fmt.Errorf("visita %s: %w", v.ID, err)
			}
			c.Visitas++
		}
		for _, i := range plan.Incidencias {
			if _, err := tx.Exec(ctx, `INSERT INTO incidencias (id, escuela_id, visita_id, titulo, descripcion,
				categoria, severidad, fecha_reporte, estado, fecha_resolucion, notas_resolucion, resuelta_en_visita)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
				i.ID, i.SchoolID, nulo(i.VisitID), i.Title, i.Description, i.Category, i.Severity,
				i.ReportedDate, i.Status, nulo(i.ResolvedDate), i.ResolutionNotes, i.ResolvedInVisitNumber); err != nil {
				return fmt.Errorf("incidencia %s: %w", i.ID, err)
			}
			c.Incidencias++
		}
		for _, l := range plan.Bitacora {
			detalle, err := json.Marshal(l.Details)
			if err != nil {
				return err
			}
			etiquetas := l.Tags
			if etiquetas == nil {
				etiquetas = []string{}
			}
			if _, err := tx.Exec(ctx, `INSERT INTO bitacora (id, momento, escuela_id, escuela_numero,
				escuela_nombre, cuenta_id, autor_nombre, autor_rol, accion, categoria, etiqueta, etiquetas,
				resumen, detalle, notas, importada)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true)`,
				l.ID, l.Timestamp, nulo(l.SchoolID), l.SchoolNumber, l.SchoolName,
				nulo(plan.CuentaDeBitacora[l.ID]), l.UserName, l.UserRole, l.ActionType, l.Category,
				l.EventTag, etiquetas, l.Summary, detalle, l.Notes); err != nil {
				return fmt.Errorf("bitacora %s: %w", l.ID, err)
			}
			c.Bitacora++
		}

		// La importacion misma queda registrada (FR-023). No hay sesion: el
		// autor es el comando.
		_, err := tx.Exec(ctx, `INSERT INTO bitacora (id, autor_nombre, autor_rol, accion, categoria,
			etiqueta, etiquetas, resumen, notas)
			VALUES ($1, 'Importación (comando del servidor)', '', 'IMPORT', 'Nota Administrativa',
			'Acuerdo Administrativo', '{Acuerdo Administrativo}', $2, $3)`,
			bitacora.NuevoID(), "Importación del legajo: "+c.String(), "Archivo: "+archivo)
		return err
	})
	return c, err
}
