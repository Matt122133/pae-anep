# Imagen del servicio para Railway.
#
# Dos etapas: se compila con el toolchain completo y se despacha un binario
# estatico sobre una imagen sin shell ni gestor de paquetes. Menos superficie en
# un servicio que guarda datos personales.

FROM golang:1.26-alpine AS build
WORKDIR /src

# go.mod y go.sum primero: mientras no cambien, la capa de dependencias se
# reaprovecha.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Los tres binarios: el servicio y los comandos de administracion, para poder
# correrlos dentro del contenedor (railway ssh) sin toolchain.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/cuentas ./cmd/cuentas \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/importar ./cmd/importar

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/ /
USER nonroot:nonroot
# Railway inyecta PORT; esto es documentacion.
EXPOSE 8080
ENTRYPOINT ["/api"]
