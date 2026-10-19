# Quickstart — validar 001 de punta a punta

## Requisitos

Go 1.26+, Node 22, Docker Desktop corriendo.

## 1. Bases locales

```bash
# Pruebas (se vacía en cada corrida de tests). Puerto 55432.
docker run -d --name pae-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=pae_test -p 55432:5432 postgres:17
# Desarrollo (persistente). Puerto 55433.
docker run -d --name pae-pg-dev  -e POSTGRES_PASSWORD=dev  -e POSTGRES_DB=pae_dev  -p 55433:5432 postgres:17
```

## 2. Verify automático

Desde la raíz: el `verify:` del plan. Tiene que dar verde **sin** `PAE_SIN_DB`;
si la base de pruebas está apagada, las pruebas del backend **fallan** (D16).

## 3. Servicio y cuentas

```bash
cd backend && cp .env.example .env   # DATABASE_URL a 55433, CORS_ORIGENES=http://localhost:3000
./dev.sh                              # levanta la base dev si hace falta, migra, arranca en :8080
go run ./cmd/cuentas crear -usuario valentina -nombre "Valentina (prueba)" -rol "Ecónoma del PAE"
go run ./cmd/cuentas crear -usuario karina -nombre "Karina (prueba)" -rol "Ecónoma del PAE"
go run ./cmd/importar -archivo cmd/importar/testdata/ejemplo.json
```

## 4. Escenarios manuales (navegador A y navegador B o ventana privada)

`VITE_API_URL=http://localhost:8080 npm run dev`

| # | Historia | Pasos | Esperado |
|---|---|---|---|
| 1 | H1 | Abrir sin sesión | Pantalla de ingreso; ningún dato |
| 2 | H1 | Contraseña mala; usuario inexistente | Mismo mensaje en los dos |
| 3 | H1 | 6 intentos fallidos seguidos y después la correcta | Sigue rechazando hasta pasados 15 min |
| 4 | H1/H2 | A ingresa, registra visita; B recarga | B la ve; bitácora "por Valentina" |
| 5 | H2 | A y B abren la misma auxiliar | Cada una ve "X está editando esta ficha" |
| 6 | H2 | B guarda, después A guarda | A recibe aviso de conflicto, ve la versión actual, no pierde lo suyo |
| 7 | H2 | `curl -X DELETE` a una entrada de bitácora con token válido | `405`; con SQL directo, el trigger rechaza |
| 8 | H3 | DevTools → Offline, guardar visita, cerrar pestaña, reabrir | Contador "1 no enviado", contenido intacto |
| 9 | H3 | Volver online, "Reenviar" dos veces rápido | La visita existe una sola vez (verificar en B) |
| 10 | H3 | Buscar "sincronizado" en toda la app | No aparece el simulador ni el toggle offline |
| 11 | H4 | `cuentas resetear -usuario karina` | B (Karina) queda afuera; contraseña vieja no sirve |
| 12 | H5 | `importar` con un JSON con un `schoolId` roto | Nada cargado; error con ubicación |
| 13 | H2 | Trasladar una auxiliar de escuela | Aparece en la nueva; la historia en ambas |
| 14 | H2 | Dar de baja una escuela | Desaparece del listado; sus visitas se siguen viendo |

Cuentas y datos de estas pruebas son **ficticios**. Nunca usar el JSON real
para probar en local si la máquina no es la del dueño del repo.
