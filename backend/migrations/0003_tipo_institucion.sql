-- Tipo de institucion (010): escuela o jardin. Ver
-- docs/decisions/jardin-tipo-de-institucion.md.
--
-- Un jardin es una fila mas de escuelas: mismos datos y mismas relaciones.
-- El numero sigue siendo unico entre todas (escuelas_numero_key). Las
-- existentes quedan como escuelas.

ALTER TABLE escuelas ADD COLUMN tipo text NOT NULL DEFAULT 'Escuela'
    CHECK (tipo IN ('Escuela', 'Jardín'));
