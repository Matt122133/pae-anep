// Package importacion carga en la base el legajo real a partir de un JSON con
// la forma del respaldo que exporta la app (contracts/importacion.md).
//
// **Todo o nada** (FR-021): primero se valida el archivo completo y se juntan
// todos los errores; si hay uno solo, no se escribe nada. El archivo real tiene
// datos personales y nunca entra al repo (datos/ esta ignorado).
package importacion

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/legajo"
)

// Archivo es la forma del JSON de entrada: DatabaseState.
type Archivo struct {
	Schools      []json.RawMessage `json:"schools"`
	Staff        []json.RawMessage `json:"staff"`
	Visits       []json.RawMessage `json:"visits"`
	Issues       []json.RawMessage `json:"issues"`
	ActivityLogs []json.RawMessage `json:"activityLogs"`
}

// Existentes es lo que ya hay en la base, para no chocar al usar -agregar.
type Existentes struct {
	Escuelas, NumerosEscuela, Personal, Visitas, Incidencias, Bitacora map[string]bool
	// NumerosVisita es el mayor numero de visita por escuela ya guardado.
	NumerosVisita map[string]int
}

// Plan es el legajo validado y listo para cargar.
type Plan struct {
	Escuelas    []legajo.School
	Personal    []legajo.StaffMember
	Visitas     []legajo.Visit
	Incidencias []legajo.SchoolIssue
	Bitacora    []legajo.ActivityLog
	// CuentaDeBitacora asocia cada entrada historica a una cuenta, si el
	// usuario coincide.
	CuentaDeBitacora map[string]string
}

// Resultado de validar.
type Resultado struct {
	Plan    *Plan
	Errores []string
	Avisos  []string
}

// camposLegados son los que exporta la app de hoy y el backend ya no guarda
// (eran del simulador de sincronizacion). Se ignoran sin aviso.
var camposLegados = map[string]bool{"isOfflinePendingSync": true, "offlineSavedAt": true, "syncedAt": true}

// aliasModalidad: valores viejos que la app todavia puede exportar.
var aliasModalidad = map[string]string{
	"Especial":           "Escuelas de Educación Especial",
	"Educación Especial": "Escuelas de Educación Especial",
}

// Validar revisa el archivo entero. cuentas mapea usuario → id de cuenta, para
// asociar visitantes y autores historicos con las cuentas reales.
func Validar(datos []byte, ex Existentes, cuentas map[string]string) Resultado {
	var res Resultado
	errorf := func(f string, a ...any) { res.Errores = append(res.Errores, fmt.Sprintf(f, a...)) }
	avisof := func(f string, a ...any) { res.Avisos = append(res.Avisos, fmt.Sprintf(f, a...)) }

	var arch Archivo
	if err := json.Unmarshal(datos, &arch); err != nil {
		errorf("el archivo no es un JSON con la forma del respaldo: %v", err)
		return res
	}
	if len(arch.Schools) == 0 {
		errorf("schools: no hay ninguna escuela")
	}

	plan := &Plan{CuentaDeBitacora: map[string]string{}}
	escuelas := map[string]bool{}
	activas := map[string]bool{}
	numeros := map[int]string{}
	visitasDeEscuela := map[string]string{}

	// leer decodifica un elemento sin rechazar campos desconocidos, pero
	// avisando de cada uno: suelen ser typos del script de conversion.
	leer := func(ruta string, crudo json.RawMessage, destino any) bool {
		if err := json.Unmarshal(crudo, destino); err != nil {
			errorf("%s: %v", ruta, err)
			return false
		}
		var m map[string]json.RawMessage
		json.Unmarshal(crudo, &m)
		conocidos := camposJSON(reflect.TypeOf(destino).Elem())
		for k := range m {
			if !conocidos[k] && !camposLegados[k] {
				avisof("%s.%s: campo desconocido, se ignora", ruta, k)
			}
		}
		return true
	}
	agregarInvalido := func(ruta string, err error) {
		var inv *legajo.ErrInvalido
		if errors.As(err, &inv) {
			claves := make([]string, 0, len(inv.Campos))
			for c := range inv.Campos {
				claves = append(claves, c)
			}
			sort.Strings(claves)
			for _, c := range claves {
				errorf("%s.%s: %s", ruta, c, inv.Campos[c])
			}
		} else if err != nil {
			errorf("%s: %v", ruta, err)
		}
	}
	idRepetido := func(ruta, id string, vistos, enBase map[string]bool) bool {
		switch {
		case vistos[id]:
			errorf("%s.id: id %q repetido en el archivo", ruta, id)
		case enBase[id]:
			errorf("%s.id: id %q ya existe en la base", ruta, id)
		default:
			vistos[id] = true
			return false
		}
		return true
	}

	vistos := map[string]bool{}
	for k, crudo := range arch.Schools {
		ruta := fmt.Sprintf("schools[%d]", k)
		var s legajo.School
		if !leer(ruta, crudo, &s) {
			continue
		}
		if alias, ok := aliasModalidad[s.Modality]; ok {
			s.Modality = alias
		}
		s.Active = true
		agregarInvalido(ruta, legajo.ValidarEscuela(&s))
		if s.ID != "" && idRepetido(ruta, s.ID, vistos, ex.Escuelas) {
			continue
		}
		if otra, ok := numeros[s.Number]; ok && s.Number > 0 {
			errorf("%s.number: el número %d ya lo usa %s", ruta, s.Number, otra)
		} else if ex.NumerosEscuela[fmt.Sprint(s.Number)] {
			errorf("%s.number: el número %d ya existe en la base", ruta, s.Number)
		}
		numeros[s.Number] = ruta
		escuelas[s.ID], activas[s.ID] = true, true
		plan.Escuelas = append(plan.Escuelas, s)
	}
	existeEscuela := func(id string) bool { return escuelas[id] || ex.Escuelas[id] }

	vistos = map[string]bool{}
	for k, crudo := range arch.Staff {
		ruta := fmt.Sprintf("staff[%d]", k)
		var p legajo.StaffMember
		if !leer(ruta, crudo, &p) {
			continue
		}
		agregarInvalido(ruta, legajo.ValidarPersonal(&p))
		if p.ID != "" && idRepetido(ruta, p.ID, vistos, ex.Personal) {
			continue
		}
		if p.SchoolID != "" && !existeEscuela(p.SchoolID) {
			errorf("%s.schoolId: escuela %q no existe", ruta, p.SchoolID)
		}
		// En el respaldo `active` puede faltar: se toma como activa.
		var m map[string]json.RawMessage
		json.Unmarshal(crudo, &m)
		if _, hay := m["active"]; !hay {
			p.Active = true
		}
		plan.Personal = append(plan.Personal, p)
	}

	vistos = map[string]bool{}
	for k, crudo := range arch.Visits {
		ruta := fmt.Sprintf("visits[%d]", k)
		var v legajo.Visit
		if !leer(ruta, crudo, &v) {
			continue
		}
		agregarInvalido(ruta, legajo.ValidarVisita(&v))
		if v.ID != "" && idRepetido(ruta, v.ID, vistos, ex.Visitas) {
			continue
		}
		if v.SchoolID != "" && !existeEscuela(v.SchoolID) {
			errorf("%s.schoolId: escuela %q no existe", ruta, v.SchoolID)
		}
		// Visitantes: el usuario de una cuenta se traduce a su id; cualquier
		// otro texto se guarda como autoria historica.
		for i, quien := range v.Visitors {
			if id, ok := cuentas[strings.ToLower(quien)]; ok {
				v.Visitors[i] = id
			}
		}
		visitasDeEscuela[v.ID] = v.SchoolID
		plan.Visitas = append(plan.Visitas, v)
	}
	asignarNumeros(plan.Visitas, ex.NumerosVisita, errorf)

	vistos = map[string]bool{}
	for k, crudo := range arch.Issues {
		ruta := fmt.Sprintf("issues[%d]", k)
		var i legajo.SchoolIssue
		if !leer(ruta, crudo, &i) {
			continue
		}
		agregarInvalido(ruta, legajo.ValidarIncidencia(&i))
		if i.ID != "" && idRepetido(ruta, i.ID, vistos, ex.Incidencias) {
			continue
		}
		if i.SchoolID != "" && !existeEscuela(i.SchoolID) {
			errorf("%s.schoolId: escuela %q no existe", ruta, i.SchoolID)
		}
		if i.VisitID != "" {
			if esc, ok := visitasDeEscuela[i.VisitID]; !ok {
				errorf("%s.visitId: visita %q no existe en el archivo", ruta, i.VisitID)
			} else if esc != i.SchoolID {
				errorf("%s.visitId: la visita %q es de otra escuela", ruta, i.VisitID)
			}
		}
		plan.Incidencias = append(plan.Incidencias, i)
	}

	vistos = map[string]bool{}
	for k, crudo := range arch.ActivityLogs {
		ruta := fmt.Sprintf("activityLogs[%d]", k)
		var l legajo.ActivityLog
		if !leer(ruta, crudo, &l) {
			continue
		}
		if l.ID == "" {
			errorf("%s.id: obligatorio", ruta)
			continue
		}
		if idRepetido(ruta, l.ID, vistos, ex.Bitacora) {
			continue
		}
		if _, err := time.Parse(time.RFC3339Nano, l.Timestamp); err != nil {
			errorf("%s.timestamp: fecha y hora ISO invalida: %q", ruta, l.Timestamp)
		}
		if strings.TrimSpace(l.UserName) == "" {
			errorf("%s.userName: obligatorio", ruta)
		}
		if strings.TrimSpace(l.Summary) == "" {
			errorf("%s.summary: obligatorio", ruta)
		}
		if !accionesValidas[l.ActionType] {
			errorf("%s.actionType: valor no permitido: %s", ruta, l.ActionType)
		}
		if !categoriasValidas[l.Category] {
			errorf("%s.category: valor no permitido: %s", ruta, l.Category)
		}
		if id, ok := cuentas[strings.ToLower(l.UserID)]; ok {
			plan.CuentaDeBitacora[l.ID] = id
		}
		plan.Bitacora = append(plan.Bitacora, l)
	}

	if len(res.Errores) == 0 {
		res.Plan = plan
	}
	return res
}

var accionesValidas = map[string]bool{"CREATE": true, "UPDATE": true, "DELETE": true, "STATUS_CHANGE": true,
	"VISIT_LOG": true, "SYNC_OFFLINE_DATA": true, "ADMIN_NOTE": true}

var categoriasValidas = map[string]bool{"Legajo Institucional": true, "Auxiliares y Personal": true,
	"Visitas de Campo": true, "Seguimiento de Casos": true, "Agua y Leche": true, "Remitos y Alimentos": true,
	"Sincronización Offline": true, "Nota Administrativa": true}

// asignarNumeros respeta visitNumber cuando viene y no choca; al resto le da
// el siguiente libre por escuela, en orden de fecha.
func asignarNumeros(visitas []legajo.Visit, previos map[string]int, errorf func(string, ...any)) {
	usados := map[string]map[int]bool{}
	maximo := map[string]int{}
	for esc, n := range previos {
		maximo[esc] = n
	}
	orden := make([]int, len(visitas))
	for i := range orden {
		orden[i] = i
	}
	sort.SliceStable(orden, func(a, b int) bool { return visitas[orden[a]].Date < visitas[orden[b]].Date })

	for _, i := range orden {
		v := &visitas[i]
		if usados[v.SchoolID] == nil {
			usados[v.SchoolID] = map[int]bool{}
		}
		if v.VisitNumber > 0 {
			if usados[v.SchoolID][v.VisitNumber] || v.VisitNumber <= previos[v.SchoolID] {
				errorf("visits (id %s).visitNumber: el número %d ya está usado en la escuela %s", v.ID, v.VisitNumber, v.SchoolID)
				continue
			}
			usados[v.SchoolID][v.VisitNumber] = true
			if v.VisitNumber > maximo[v.SchoolID] {
				maximo[v.SchoolID] = v.VisitNumber
			}
		}
	}
	for _, i := range orden {
		v := &visitas[i]
		if v.VisitNumber == 0 {
			maximo[v.SchoolID]++
			v.VisitNumber = maximo[v.SchoolID]
		}
	}
}

// camposJSON lista los nombres JSON de un struct, incluidos los embebidos.
func camposJSON(t reflect.Type) map[string]bool {
	out := map[string]bool{}
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if f.Anonymous && f.Type.Kind() == reflect.Struct {
			for k := range camposJSON(f.Type) {
				out[k] = true
			}
			continue
		}
		nombre := strings.Split(f.Tag.Get("json"), ",")[0]
		if nombre != "" && nombre != "-" {
			out[nombre] = true
		}
	}
	return out
}
