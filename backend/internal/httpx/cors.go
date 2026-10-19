package httpx

import (
	"net/http"
	"strings"
)

// CabecerasPermitidas es lo que autoriza el preflight. Hay que MANTENERLA: una
// cabecera que la app agregue y no figure aca hace que el navegador corte el
// pedido sin mandarlo, y del lado del servidor no queda ningun rastro (paso en
// flash-urbano con Idempotency-Key: el verify estaba verde y ningun navegador
// podia crear pedidos).
const CabecerasPermitidas = "Authorization, Content-Type"

// MetodosPermitidos es la otra mitad del preflight. cmd/api tiene una prueba
// que la compara contra los metodos que las rutas registran de verdad.
const MetodosPermitidos = "GET, HEAD, POST, PUT, DELETE, OPTIONS"

// CORS deja pasar solo los origenes configurados (FR-008). Es el middleware mas
// exterior.
//
// No manda Access-Control-Allow-Credentials: es para cookies, y este servicio
// no usa cookies (la credencial va en Authorization, FR-007).
func CORS(origenesPermitidos []string, siguiente http.Handler) http.Handler {
	permitidos := make(map[string]bool, len(origenesPermitidos))
	for _, o := range origenesPermitidos {
		permitidos[strings.TrimSpace(o)] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origen := r.Header.Get("Origin")
		// La respuesta depende del Origin: sin Vary un cache intermedio podria
		// servirle a un origen la respuesta calculada para otro.
		w.Header().Add("Vary", "Origin")

		if origen != "" && permitidos[origen] {
			w.Header().Set("Access-Control-Allow-Origin", origen)
			w.Header().Set("Access-Control-Allow-Methods", MetodosPermitidos)
			w.Header().Set("Access-Control-Allow-Headers", CabecerasPermitidas)
			w.Header().Set("Access-Control-Max-Age", "600")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Un origen presente y no autorizado se rechaza tambien aca: confiar
		// solo en el navegador deja pasar a cualquier cliente que no lo sea.
		if origen != "" && !permitidos[origen] {
			Error(w, http.StatusForbidden, "origen_no_autorizado")
			return
		}

		// Sin Origin no es un pedido cruzado (curl, chequeo de salud): no hay
		// nada que autorizar. Igual las rutas de datos piden sesion.
		siguiente.ServeHTTP(w, r)
	})
}

// IPDelCliente devuelve la direccion de quien hizo el pedido.
//
// Con confiarProxy, la ULTIMA entrada de X-Forwarded-For: Railway pone un proxy
// adelante y RemoteAddr es el mismo para todo el mundo, lo que convertiria un
// limite por IP en uno global (research D4). Es la ultima y no la primera
// porque el cliente puede mandar su propio encabezado y esas entradas quedan a
// la izquierda; la que agrega el proxy va al final y no se puede falsificar.
func IPDelCliente(r *http.Request, confiarProxy bool) string {
	if confiarProxy {
		if reenviado := r.Header.Get("X-Forwarded-For"); reenviado != "" {
			partes := strings.Split(reenviado, ",")
			if ultima := strings.TrimSpace(partes[len(partes)-1]); ultima != "" {
				return ultima
			}
		}
	}
	direccion := r.RemoteAddr
	if i := strings.LastIndex(direccion, ":"); i != -1 {
		direccion = direccion[:i]
	}
	return strings.Trim(direccion, "[]")
}
