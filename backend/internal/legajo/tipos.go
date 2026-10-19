// Package legajo es el legajo compartido: escuelas, personal, visitas,
// incidencias, y la lectura completa que consume el frontend.
//
// Los nombres JSON son **los de src/types/index.ts**, a proposito: el
// frontend ya trabaja con esa forma y no tiene que traducir nada
// (contracts/api.md). Si se agrega un campo alla, se agrega aca; los tipos se
// sincronizan a mano (como en flash-urbano: menos maquinaria que problema).
package legajo

import (
	"encoding/json"
	"errors"
)

// MealServices son los servicios de comedor de la escuela.
type MealServices struct {
	Breakfast bool `json:"breakfast"`
	Lunch     bool `json:"lunch"`
	Snack     bool `json:"snack"`
}

// School es una escuela. totalVisits, lastVisitDate y activeIssuesCount son
// derivados: el servidor los calcula y los ignora si vienen (research D10).
type School struct {
	ID                     string       `json:"id"`
	Number                 int          `json:"number"`
	Name                   string       `json:"name"`
	Department             string       `json:"department"`
	AreaType               string       `json:"areaType"`
	Zone                   string       `json:"zone,omitempty"`
	AssignedInspector      string       `json:"assignedInspector"`
	Address                string       `json:"address"`
	Phone                  string       `json:"phone"`
	Email                  string       `json:"email"`
	PrincipalName          string       `json:"principalName"`
	HeadCookName           string       `json:"headCookName"`
	Modality               string       `json:"modality"`
	StudentDinersCount     int          `json:"studentDinersCount"`
	StaffDinersCount       int          `json:"staffDinersCount"`
	MealServices           MealServices `json:"mealServices"`
	HasWaterSupply         bool         `json:"hasWaterSupply"`
	WaterPurchaseAllowance bool         `json:"waterPurchaseAllowance"`
	WaterNotes             string       `json:"waterNotes,omitempty"`
	MilkProgramType        string       `json:"milkProgramType"`
	MilkPowderKg           float64      `json:"milkPowderKg"`
	MilkNotes              string       `json:"milkNotes,omitempty"`
	Notes                  string       `json:"notes"`

	LastVisitDate     string `json:"lastVisitDate,omitempty"`
	TotalVisits       int    `json:"totalVisits"`
	ActiveIssuesCount int    `json:"activeIssuesCount"`

	Active  bool `json:"active"`
	Version int  `json:"version"`
}

// StaffMember es una persona del personal de cocina. Datos personales.
type StaffMember struct {
	ID                        string `json:"id"`
	SchoolID                  string `json:"schoolId"`
	FullName                  string `json:"fullName"`
	CI                        string `json:"ci"`
	Role                      string `json:"role"`
	InstitutionType           string `json:"institutionType"`
	EnterpriseName            string `json:"enterpriseName,omitempty"`
	HealthCardValidUntil      string `json:"healthCardValidUntil"`
	FoodHandlerCardValidUntil string `json:"foodHandlerCardValidUntil"`
	SocialSecurityStatus      string `json:"socialSecurityStatus"`
	Phone                     string `json:"phone,omitempty"`
	Notes                     string `json:"notes,omitempty"`
	Active                    bool   `json:"active"`
	Version                   int    `json:"version"`
}

// HygieneChecklist es la lista de control de higiene de la visita.
type HygieneChecklist struct {
	ColdChain            string `json:"coldChain"`
	RawCookedSeparation  string `json:"rawCookedSeparation"`
	Cleanliness          string `json:"cleanliness"`
	UniformAndCaps       string `json:"uniformAndCaps"`
	PotableWaterChlorine string `json:"potableWaterChlorine"`
	WasteDisposal        string `json:"wasteDisposal"`
}

// UnauthorizedItem es un alimento no autorizado encontrado.
type UnauthorizedItem struct {
	ID          string `json:"id"`
	Item        string `json:"item"`
	Category    string `json:"category"`
	Reason      string `json:"reason"`
	ActionTaken string `json:"actionTaken"`
}

// BoolOTexto acepta true/false o un texto: en el formulario actual dos campos
// de registros admiten las dos formas (`boolean | string` en TypeScript).
type BoolOTexto struct{ valor json.RawMessage }

func (b BoolOTexto) MarshalJSON() ([]byte, error) {
	if len(b.valor) == 0 {
		return []byte("null"), nil
	}
	return b.valor, nil
}

func (b *BoolOTexto) UnmarshalJSON(d []byte) error {
	var v any
	if err := json.Unmarshal(d, &v); err != nil {
		return err
	}
	switch v.(type) {
	case bool, string, nil:
		b.valor = append(json.RawMessage(nil), d...)
		return nil
	}
	return errors.New("tiene que ser true, false o un texto")
}

// VisitaContenido es todo lo de la visita que va en la columna jsonb
// `contenido` (research D5): texto libre que nadie filtra. Va embebido en Visit,
// asi que en el JSON queda plano, como en el frontend.
type VisitaContenido struct {
	ScheduledObjective      string `json:"scheduledObjective,omitempty"`
	ItineraryNotes          string `json:"itineraryNotes,omitempty"`
	InspectorName           string `json:"inspectorName"`
	InspectorRole           string `json:"inspectorRole"`
	NutritionistName        string `json:"nutritionistName,omitempty"`
	AssignedSchoolInspector string `json:"assignedSchoolInspector,omitempty"`
	AttendedBy              string `json:"attendedBy"`

	InitialFieldObservations string `json:"initialFieldObservations,omitempty"`

	MenuPlanned       string `json:"menuPlanned"`
	MenuServed        string `json:"menuServed"`
	ActualAdultsCount *int   `json:"actualAdultsCount,omitempty"`

	StaffHygieneNotes    string           `json:"staffHygieneNotes,omitempty"`
	FacilityHygieneNotes string           `json:"facilityHygieneNotes,omitempty"`
	HygieneChecklist     HygieneChecklist `json:"hygieneChecklist"`
	StorageNotes         string           `json:"storageNotes,omitempty"`
	ServiceNotes         string           `json:"serviceNotes,omitempty"`
	EquipmentNotes       string           `json:"equipmentNotes,omitempty"`
	ProvidersNotes       string           `json:"providersNotes,omitempty"`

	LunchMenu            string `json:"lunchMenu,omitempty"`
	BreakfastOrSnackMenu string `json:"breakfastOrSnackMenu,omitempty"`
	WeeklyMenuDates      string `json:"weeklyMenuDates,omitempty"`
	WeeklyMenuMonday     string `json:"weeklyMenuMonday,omitempty"`
	WeeklyMenuTuesday    string `json:"weeklyMenuTuesday,omitempty"`
	WeeklyMenuWednesday  string `json:"weeklyMenuWednesday,omitempty"`
	WeeklyMenuThursday   string `json:"weeklyMenuThursday,omitempty"`
	WeeklyMenuFriday     string `json:"weeklyMenuFriday,omitempty"`

	RecipeCompliance           string `json:"recipeCompliance,omitempty"`
	FoodVariabilityAndDesserts string `json:"foodVariabilityAndDesserts,omitempty"`
	MenuVariabilitySuggestions string `json:"menuVariabilitySuggestions,omitempty"`

	MonthlySheetsSentToEmail *BoolOTexto `json:"monthlySheetsSentToEmail,omitempty"`
	KitchenLogbooksInOrder   *BoolOTexto `json:"kitchenLogbooksInOrder,omitempty"`
	RecordsNotes             string      `json:"recordsNotes,omitempty"`
	DeliveryNotesChecked     bool        `json:"deliveryNotesChecked"`
	DeliveryNotesDetails     string      `json:"deliveryNotesDetails"`

	UnauthorizedPurchasesInRecords string             `json:"unauthorizedPurchasesInRecords,omitempty"`
	UnauthorizedItemsFound         bool               `json:"unauthorizedItemsFound"`
	UnauthorizedItemsList          []UnauthorizedItem `json:"unauthorizedItemsList"`

	SnackAndBreakfastRecorded string `json:"snackAndBreakfastRecorded,omitempty"`
	HealthySnackNotes         string `json:"healthySnackNotes,omitempty"`
	SchoolCanteenNotes        string `json:"schoolCanteenNotes,omitempty"`
	HomeSnackNotes            string `json:"homeSnackNotes,omitempty"`
	SpecialMenusNotes         string `json:"specialMenusNotes,omitempty"`

	StaffFeedbackNotes    string `json:"staffFeedbackNotes,omitempty"`
	MeetingMinutes        string `json:"meetingMinutes"`
	Suggestions           string `json:"suggestions"`
	GeneralObservations   string `json:"generalObservations"`
	IssuesFollowUpSummary string `json:"issuesFollowUpSummary,omitempty"`
}

// Visit es una visita tecnica, realizada o programada. Las columnas con
// reglas van como campos propios; el resto, en VisitaContenido.
type Visit struct {
	ID                string   `json:"id"`
	SchoolID          string   `json:"schoolId"`
	VisitNumber       int      `json:"visitNumber"`
	Date              string   `json:"date"`
	Time              string   `json:"time"`
	Status            string   `json:"status"`
	Visitors          []string `json:"visitors"`
	DinersActualCount int      `json:"dinersActualCount"`
	MenuEvaluation    string   `json:"menuEvaluation"`
	VisitaContenido
	Version int `json:"version"`
}

// SchoolIssue es una incidencia/observacion de seguimiento.
type SchoolIssue struct {
	ID                    string `json:"id"`
	SchoolID              string `json:"schoolId"`
	VisitID               string `json:"visitId,omitempty"`
	Title                 string `json:"title"`
	Description           string `json:"description"`
	Category              string `json:"category"`
	Severity              string `json:"severity"`
	ReportedDate          string `json:"reportedDate"`
	Status                string `json:"status"`
	ResolvedDate          string `json:"resolvedDate,omitempty"`
	ResolutionNotes       string `json:"resolutionNotes,omitempty"`
	ResolvedInVisitNumber *int   `json:"resolvedInVisitNumber,omitempty"`
	Version               int    `json:"version"`
}

// ActivityChangeDetail es un campo cambiado en una entrada de bitacora.
type ActivityChangeDetail struct {
	Field      string `json:"field"`
	FieldLabel string `json:"fieldLabel"`
	OldValue   any    `json:"oldValue"`
	NewValue   any    `json:"newValue"`
}

// ActivityLog es una entrada de bitacora. Inmutable.
type ActivityLog struct {
	ID           string                 `json:"id"`
	Timestamp    string                 `json:"timestamp"`
	SchoolID     string                 `json:"schoolId,omitempty"`
	SchoolNumber *int                   `json:"schoolNumber,omitempty"`
	SchoolName   string                 `json:"schoolName,omitempty"`
	UserID       string                 `json:"userId"`
	UserName     string                 `json:"userName"`
	UserRole     string                 `json:"userRole"`
	ActionType   string                 `json:"actionType"`
	Category     string                 `json:"category"`
	EventTag     string                 `json:"eventTag,omitempty"`
	Tags         []string               `json:"tags"`
	Summary      string                 `json:"summary"`
	Details      []ActivityChangeDetail `json:"details"`
	Notes        string                 `json:"notes,omitempty"`
	Imported     bool                   `json:"imported,omitempty"`
}

// CuentaPublica es lo que el frontend sabe de cada integrante (para elegir
// visitantes y mostrar autores). Reemplaza a PAE_TEAM_MEMBERS.
type CuentaPublica struct {
	ID      string `json:"id"`
	Usuario string `json:"usuario"`
	Nombre  string `json:"nombre"`
	Rol     string `json:"rol"`
}

// Legajo es la respuesta de GET /legajo: la forma de DatabaseState.
type Legajo struct {
	Schools      []School        `json:"schools"`
	Staff        []StaffMember   `json:"staff"`
	Visits       []Visit         `json:"visits"`
	Issues       []SchoolIssue   `json:"issues"`
	ActivityLogs []ActivityLog   `json:"activityLogs"`
	Cuentas      []CuentaPublica `json:"cuentas"`
}
