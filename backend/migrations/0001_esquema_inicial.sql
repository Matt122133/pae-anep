-- Esquema inicial del legajo compartido (001). Ver
-- specs/001-backend-legajo-compartido/data-model.md.
--
-- Las listas cerradas van como text + CHECK y no como enum de Postgres:
-- cambiar una lista es una linea de migracion, no un ALTER TYPE.

-- ---------------------------------------------------------------- identidad

CREATE TABLE cuentas (
    id              text PRIMARY KEY,
    usuario         text NOT NULL UNIQUE CHECK (usuario ~ '^[a-z0-9._-]{3,32}$'),
    nombre          text NOT NULL CHECK (btrim(nombre) <> ''),
    rol             text NOT NULL CHECK (rol IN ('Ecónoma del PAE', 'Licenciada en Nutrición')),
    hash_contrasena text NOT NULL,
    activa          boolean NOT NULL DEFAULT true,
    creada_en       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sesiones (
    id         text PRIMARY KEY,
    cuenta_id  text NOT NULL REFERENCES cuentas (id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE,
    creada_en  timestamptz NOT NULL DEFAULT now(),
    ultimo_uso timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sesiones_cuenta ON sesiones (cuenta_id);

CREATE TABLE intentos_ingreso (
    usuario text NOT NULL,
    ip      text NOT NULL,
    exito   boolean NOT NULL,
    momento timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intentos_usuario ON intentos_ingreso (usuario, momento);
CREATE INDEX intentos_ip ON intentos_ingreso (ip, momento);

-- ------------------------------------------------------------------- legajo

CREATE TABLE escuelas (
    id                   text PRIMARY KEY,
    numero               integer NOT NULL UNIQUE CHECK (numero > 0),
    nombre               text NOT NULL CHECK (btrim(nombre) <> ''),
    departamento         text NOT NULL DEFAULT 'Tacuarembó',
    ambito               text NOT NULL CHECK (ambito IN ('Rural', 'Urbana')),
    zona                 text NOT NULL DEFAULT '',
    inspector            text NOT NULL DEFAULT '',
    direccion            text NOT NULL DEFAULT '',
    telefono             text NOT NULL DEFAULT '',
    email                text NOT NULL DEFAULT '',
    director             text NOT NULL DEFAULT '',
    cocinera_responsable text NOT NULL DEFAULT '',
    modalidad            text NOT NULL CHECK (modalidad IN (
                             'Tiempo Completo', 'Tiempo Extendido', 'Común', 'Aprender',
                             'Escuelas de Educación Especial',
                             'Escuelas de Educación Artística (EDEA)',
                             'TPA', 'Rural', 'Práctica')),
    comensales_alumnos   integer NOT NULL DEFAULT 0 CHECK (comensales_alumnos >= 0),
    comensales_personal  integer NOT NULL DEFAULT 0 CHECK (comensales_personal >= 0),
    servicio_desayuno    boolean NOT NULL DEFAULT false,
    servicio_almuerzo    boolean NOT NULL DEFAULT false,
    servicio_merienda    boolean NOT NULL DEFAULT false,
    agua_ose             boolean NOT NULL DEFAULT false,
    rubro_agua           boolean NOT NULL DEFAULT false,
    notas_agua           text NOT NULL DEFAULT '',
    programa_leche       text NOT NULL DEFAULT 'Ninguno / Comedor Tradicional' CHECK (programa_leche IN (
                             'Programa de Leche Escolar', 'Programa de Copa de Leche',
                             'Ambos', 'Ninguno / Comedor Tradicional')),
    leche_kg             numeric NOT NULL DEFAULT 0 CHECK (leche_kg >= 0),
    notas_leche          text NOT NULL DEFAULT '',
    notas                text NOT NULL DEFAULT '',
    activo               boolean NOT NULL DEFAULT true,
    version              integer NOT NULL DEFAULT 1,
    actualizada_en       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE personal (
    id                      text PRIMARY KEY,
    escuela_id              text NOT NULL REFERENCES escuelas (id),
    nombre_completo         text NOT NULL CHECK (btrim(nombre_completo) <> ''),
    ci                      text NOT NULL DEFAULT '',
    rol                     text NOT NULL CHECK (rol IN (
                                'Cocinera Titular', 'Auxiliar de Cocina',
                                'Ayudante de Cocina', 'Encargada de Comedor')),
    regimen                 text NOT NULL CHECK (regimen IN (
                                'DGEIP', 'Empresa Tercerizada', 'Comisión Fomento',
                                'Aportes Patronales', 'Otra Empresa')),
    empresa                 text NOT NULL DEFAULT '',
    vence_carne_salud       date,
    vence_carne_manipulador date,
    bps                     text NOT NULL CHECK (bps IN (
                                'Al día / Registrado', 'Pendiente de Regularización', 'En trámite')),
    telefono                text NOT NULL DEFAULT '',
    notas                   text NOT NULL DEFAULT '',
    activo                  boolean NOT NULL DEFAULT true,
    version                 integer NOT NULL DEFAULT 1
);
CREATE INDEX personal_escuela ON personal (escuela_id);

-- Historial de en que escuela estuvo cada persona (FR-033). A lo sumo una
-- asignacion vigente (hasta nulo) por persona.
CREATE TABLE personal_asignaciones (
    personal_id text NOT NULL REFERENCES personal (id),
    escuela_id  text NOT NULL REFERENCES escuelas (id),
    desde       date NOT NULL,
    hasta       date,
    CHECK (hasta IS NULL OR hasta >= desde)
);
CREATE UNIQUE INDEX personal_asignacion_vigente
    ON personal_asignaciones (personal_id) WHERE hasta IS NULL;

CREATE TABLE visitas (
    id                text PRIMARY KEY,
    escuela_id        text NOT NULL REFERENCES escuelas (id),
    numero            integer NOT NULL CHECK (numero > 0),
    fecha             date NOT NULL,
    hora              text NOT NULL DEFAULT '' CHECK (hora = '' OR hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
    estado            text NOT NULL CHECK (estado IN ('Realizada', 'Programada', 'Cancelada')),
    visitantes        text[] NOT NULL DEFAULT '{}',
    comensales_reales integer NOT NULL DEFAULT 0 CHECK (comensales_reales >= 0),
    evaluacion_menu   text NOT NULL CHECK (evaluacion_menu IN (
                          'Adecuado y Variado', 'Aceptable con Ajustes', 'No cumple gramajes/guías')),
    contenido         jsonb NOT NULL DEFAULT '{}',
    version           integer NOT NULL DEFAULT 1,
    creada_por        text REFERENCES cuentas (id),
    UNIQUE (escuela_id, numero)
);

CREATE TABLE incidencias (
    id                 text PRIMARY KEY,
    escuela_id         text NOT NULL REFERENCES escuelas (id),
    visita_id          text REFERENCES visitas (id),
    titulo             text NOT NULL CHECK (btrim(titulo) <> ''),
    descripcion        text NOT NULL DEFAULT '',
    categoria          text NOT NULL CHECK (categoria IN (
                           'Higiene e Inocuidad', 'Alimentos no autorizados',
                           'Documentación de Auxiliares', 'Equipamiento/Infraestructura',
                           'Menú/Gramajes', 'Gestión de Remitos', 'Otro')),
    severidad          text NOT NULL CHECK (severidad IN ('Leve', 'Media', 'Crítica')),
    fecha_reporte      date NOT NULL,
    estado             text NOT NULL CHECK (estado IN ('Pendiente', 'En Proceso', 'Resuelto')),
    fecha_resolucion   date,
    notas_resolucion   text NOT NULL DEFAULT '',
    resuelta_en_visita integer,
    version            integer NOT NULL DEFAULT 1,
    CHECK ((estado = 'Resuelto') = (fecha_resolucion IS NOT NULL))
);
CREATE INDEX incidencias_escuela ON incidencias (escuela_id);

-- ----------------------------------------------------------------- bitacora

-- Sin FK a escuelas ni cuentas: una entrada sobrevive a todo, y copia autor y
-- escuela para decir lo que era cierto cuando se escribio.
CREATE TABLE bitacora (
    id             text PRIMARY KEY,
    momento        timestamptz NOT NULL DEFAULT now(),
    escuela_id     text,
    escuela_numero integer,
    escuela_nombre text NOT NULL DEFAULT '',
    cuenta_id      text,
    autor_nombre   text NOT NULL,
    autor_rol      text NOT NULL DEFAULT '',
    accion         text NOT NULL CHECK (accion IN (
                       'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'VISIT_LOG',
                       'SYNC_OFFLINE_DATA', 'ADMIN_NOTE', 'IMPORT')),
    categoria      text NOT NULL CHECK (categoria IN (
                       'Legajo Institucional', 'Auxiliares y Personal', 'Visitas de Campo',
                       'Seguimiento de Casos', 'Agua y Leche', 'Remitos y Alimentos',
                       'Sincronización Offline', 'Nota Administrativa')),
    etiqueta       text NOT NULL DEFAULT '',
    etiquetas      text[] NOT NULL DEFAULT '{}',
    resumen        text NOT NULL,
    detalle        jsonb NOT NULL DEFAULT '[]',
    notas          text NOT NULL DEFAULT '',
    importada      boolean NOT NULL DEFAULT false
);
CREATE INDEX bitacora_momento ON bitacora (momento DESC);
CREATE INDEX bitacora_escuela ON bitacora (escuela_id, momento DESC);

-- La inmutabilidad no puede depender de que ningun handler se olvide
-- (research D9). En Railway el servicio es dueno de las tablas, asi que un
-- REVOKE no alcanza: hace falta un trigger.
CREATE FUNCTION bitacora_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'la bitacora no se edita ni se borra';
END;
$$;

CREATE TRIGGER bitacora_inmutable
    BEFORE UPDATE OR DELETE ON bitacora
    FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable();
