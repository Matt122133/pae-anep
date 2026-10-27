-- Proveedores de cada escuela (009). Ver
-- specs/009-proveedores-escuela/research.md R1.
--
-- Nombres de texto libre, sin catalogo: no tienen identidad fuera de su
-- escuela. Las reglas (vacios, repetidos, largo) estan en validar.go para que
-- el 400 diga el campo y el motivo. Las escuelas existentes quedan sin
-- proveedores.

ALTER TABLE escuelas ADD COLUMN proveedores text[] NOT NULL DEFAULT '{}';
