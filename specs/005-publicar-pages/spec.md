# Feature Specification: Publicar el frontend en GitHub Pages

**Created**: 2026-10-21 · **Status**: Draft

**Input**: El dueño del repo: "primero tiremos el front por github pages, que sé
que hay que hacer el workflow; con respecto a railway está caído así que vamos a
tener que esperar".

## Requirements

- **FR-001**: Cada push a `master` MUST verificar el frontend (tipos y pruebas) y,
  si pasa, publicar la app en `https://matt122133.github.io/pae-anep/`. Si la
  verificación falla, no se publica. También se puede publicar a mano.
- **FR-002**: La app publicada MUST cargar completa bajo `/pae-anep/` (estilos,
  íconos, favicon) y ser instalable desde esa dirección; al abrirse instalada
  arranca en `/pae-anep/`, no en la raíz del dominio.
- **FR-003**: La dirección del servidor se toma de una variable del repositorio
  al publicar. Sin la variable, la app publicada carga y al ingresar muestra que
  no tiene servidor configurado (comportamiento que ya existe).
- **FR-004**: El acceso directo del ícono instalado deja de decir "140 Escuelas"
  (resto de `004`): dice "Escuelas".
- **FR-005**: El entorno local (`npm run dev`) sigue funcionando en `/`.
- **FR-006**: Queda escrito en el repo cómo conectar el servidor cuando Railway
  vuelva: cargar la variable, volver a publicar, y habilitar el origen de Pages
  en la configuración del servidor.

## Success Criteria

- **SC-001**: Tras el primer push a `master`, la dirección pública abre la
  pantalla de ingreso sin recursos rotos (consola sin 404).
- **SC-002**: Ingresar en la versión publicada sin servidor muestra el aviso de
  servidor no configurado, no una pantalla en blanco.
- **SC-003**: `npm run dev` abre la app en `http://localhost:3000/` igual que hoy.

## Assumptions

- Railway está caído: la primera publicación sale sin servidor. Conectarlo es
  solo configuración (variable del repo + origen permitido en Railway), sin
  código de backend.
- La app no tiene rutas: navega por estado interno, así que no hace falta el
  truco de `404.html` de Pages.
- Paso manual del dueño, una vez: Settings → Pages → Source: **GitHub Actions**.

## Fuera de alcance

Backend, lectura sin conexión, dominio propio, y los accesos directos del
manifest que hoy apuntan a `?view=`/`?tab=` aunque la app no lee esos parámetros
(se mantienen, con la ruta corregida).
