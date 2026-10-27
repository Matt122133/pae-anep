package legajo

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// Listas cerradas. Son las de src/types/index.ts y las de los CHECK de las
// migraciones (0001, 0003): si cambia una, cambian las tres.
var (
	listaTipoInstitucion = conjunto("Escuela", "Jardín")
	listaAmbito          = conjunto("Rural", "Urbana")
	listaModalidad       = conjunto("Tiempo Completo", "Tiempo Extendido", "Común", "Aprender",
		"Escuelas de Educación Especial", "Escuelas de Educación Artística (EDEA)",
		"TPA", "Rural", "Práctica")
	listaLeche = conjunto("Programa de Leche Escolar", "Programa de Copa de Leche",
		"Ambos", "Ninguno / Comedor Tradicional")
	listaRolPersonal  = conjunto("Cocinera Titular", "Auxiliar de Cocina", "Ayudante de Cocina", "Encargada de Comedor")
	listaRegimen      = conjunto("DGEIP", "Empresa Tercerizada", "Comisión Fomento", "Aportes Patronales", "Otra Empresa")
	listaBPS          = conjunto("Al día / Registrado", "Pendiente de Regularización", "En trámite")
	listaEstadoVisita = conjunto("Realizada", "Programada", "Cancelada")
	listaEvaluacion   = conjunto("Adecuado y Variado", "Aceptable con Ajustes", "No cumple gramajes/guías")
	listaHigiene      = conjunto("Bien", "Regular", "Deficiente")
	listaNoAutorizado = conjunto("Fiambres/Embutidos", "Bebidas Azucaradas", "Ultraprocesados/Golosinas",
		"Aderezos no autorizados", "Lácteos no pasteurizados", "Otro")
	listaCategoriaInc = conjunto("Higiene e Inocuidad", "Alimentos no autorizados", "Documentación de Auxiliares",
		"Equipamiento/Infraestructura", "Menú/Gramajes", "Gestión de Remitos", "Otro")
	listaSeveridad = conjunto("Leve", "Media", "Crítica")
	listaEstadoInc = conjunto("Pendiente", "En Proceso", "Resuelto")
)

func conjunto(vs ...string) map[string]bool {
	m := make(map[string]bool, len(vs))
	for _, v := range vs {
		m[v] = true
	}
	return m
}

var formaHora = regexp.MustCompile(`^[0-2][0-9]:[0-5][0-9]$`)

// errores junta los problemas de un registro, campo por campo (FR-012).
type errores map[string]string

func (e errores) vacio(campo, valor string) {
	if strings.TrimSpace(valor) == "" {
		e[campo] = "obligatorio"
	}
}

func (e errores) enLista(campo, valor string, lista map[string]bool) {
	if !lista[valor] {
		e[campo] = "valor no permitido: " + valor
	}
}

func (e errores) fecha(campo, valor string, obligatoria bool) {
	if valor == "" {
		if obligatoria {
			e[campo] = "obligatorio"
		}
		return
	}
	if _, err := time.Parse("2006-01-02", valor); err != nil {
		e[campo] = "fecha invalida, se espera AAAA-MM-DD"
	}
}

func (e errores) noNegativo(campo string, v float64) {
	if v < 0 {
		e[campo] = "no puede ser negativo"
	}
}

// proveedores recorta cada nombre en su lugar y rechaza vacios, largos y
// repetidos sin distinguir mayusculas (009, contracts/escuela.md).
func (e errores) proveedores(lista []string) {
	vistos := map[string]bool{}
	for i, nombre := range lista {
		nombre = strings.TrimSpace(nombre)
		lista[i] = nombre
		clave := strings.ToLower(nombre)
		switch {
		case nombre == "":
			e["providers"] = "hay un nombre vacío"
		case utf8.RuneCountInString(nombre) > 120:
			e["providers"] = "cada nombre admite hasta 120 caracteres"
		case vistos[clave]:
			e["providers"] = "nombre repetido: " + nombre
		}
		vistos[clave] = true
	}
}

func (e errores) err() error {
	if len(e) == 0 {
		return nil
	}
	return &ErrInvalido{Campos: e}
}

func ValidarEscuela(s *School) error {
	e := errores{}
	e.vacio("id", s.ID)
	if s.Number <= 0 {
		e["number"] = "tiene que ser mayor que cero"
	}
	e.vacio("name", s.Name)
	e.enLista("areaType", s.AreaType, listaAmbito)
	e.enLista("modality", s.Modality, listaModalidad)
	if s.MilkProgramType == "" {
		s.MilkProgramType = "Ninguno / Comedor Tradicional"
	}
	e.enLista("milkProgramType", s.MilkProgramType, listaLeche)
	e.noNegativo("studentDinersCount", float64(s.StudentDinersCount))
	e.noNegativo("staffDinersCount", float64(s.StaffDinersCount))
	e.noNegativo("milkPowderKg", s.MilkPowderKg)
	if s.Department == "" {
		s.Department = "Tacuarembó"
	}
	if s.SchoolType != "" {
		e.enLista("schoolType", s.SchoolType, listaTipoInstitucion)
	}
	e.proveedores(s.Providers)
	return e.err()
}

func ValidarPersonal(p *StaffMember) error {
	e := errores{}
	e.vacio("id", p.ID)
	e.vacio("schoolId", p.SchoolID)
	e.vacio("fullName", p.FullName)
	e.enLista("role", p.Role, listaRolPersonal)
	e.enLista("institutionType", p.InstitutionType, listaRegimen)
	e.enLista("socialSecurityStatus", p.SocialSecurityStatus, listaBPS)
	e.fecha("healthCardValidUntil", p.HealthCardValidUntil, false)
	e.fecha("foodHandlerCardValidUntil", p.FoodHandlerCardValidUntil, false)
	return e.err()
}

func ValidarVisita(v *Visit) error {
	e := errores{}
	e.vacio("id", v.ID)
	e.vacio("schoolId", v.SchoolID)
	e.fecha("date", v.Date, true)
	if v.Time != "" && !formaHora.MatchString(v.Time) {
		e["time"] = "hora invalida, se espera HH:MM"
	}
	if v.Status == "" {
		v.Status = "Realizada"
	}
	e.enLista("status", v.Status, listaEstadoVisita)
	e.enLista("menuEvaluation", v.MenuEvaluation, listaEvaluacion)
	e.noNegativo("dinersActualCount", float64(v.DinersActualCount))
	h := v.HygieneChecklist
	for campo, valor := range map[string]string{
		"hygieneChecklist.coldChain": h.ColdChain, "hygieneChecklist.rawCookedSeparation": h.RawCookedSeparation,
		"hygieneChecklist.cleanliness": h.Cleanliness, "hygieneChecklist.uniformAndCaps": h.UniformAndCaps,
		"hygieneChecklist.potableWaterChlorine": h.PotableWaterChlorine, "hygieneChecklist.wasteDisposal": h.WasteDisposal,
	} {
		// Una visita programada todavia no tiene checklist.
		if valor != "" {
			e.enLista(campo, valor, listaHigiene)
		}
	}
	for i, it := range v.UnauthorizedItemsList {
		if !listaNoAutorizado[it.Category] {
			e[campoIndice("unauthorizedItemsList", i, "category")] = "valor no permitido: " + it.Category
		}
	}
	if v.Visitors == nil {
		v.Visitors = []string{}
	}
	if v.UnauthorizedItemsList == nil {
		v.UnauthorizedItemsList = []UnauthorizedItem{}
	}
	return e.err()
}

func ValidarIncidencia(i *SchoolIssue) error {
	e := errores{}
	e.vacio("id", i.ID)
	e.vacio("schoolId", i.SchoolID)
	e.vacio("title", i.Title)
	e.enLista("category", i.Category, listaCategoriaInc)
	e.enLista("severity", i.Severity, listaSeveridad)
	e.enLista("status", i.Status, listaEstadoInc)
	e.fecha("reportedDate", i.ReportedDate, true)
	e.fecha("resolvedDate", i.ResolvedDate, false)
	// La regla de la base es Resuelto <=> fecha de resolucion. Se normaliza en
	// vez de rechazar: es lo que hacia la app al tocar "resolver".
	if i.Status == "Resuelto" && i.ResolvedDate == "" {
		i.ResolvedDate = time.Now().Format("2006-01-02")
	}
	if i.Status != "Resuelto" {
		i.ResolvedDate = ""
	}
	return e.err()
}

func campoIndice(lista string, i int, campo string) string {
	return lista + "[" + itoa(i) + "]." + campo
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	for ; i > 0; i /= 10 {
		s = string(rune('0'+i%10)) + s
	}
	return s
}
