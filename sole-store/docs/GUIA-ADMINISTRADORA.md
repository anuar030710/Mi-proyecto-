# Guía de la administradora — Sole Store

Con el **panel de administración** puedes cambiar tu tienda sin tocar código: productos, precios, unidades, fotos, textos, WhatsApp, datos legales, envíos y cupones.

**Dónde está:** en la dirección de tu tienda agrega `/admin.html`. Por ejemplo:
`https://anuar030710.github.io/Mi-proyecto-/sole-store/public/admin.html`

Las clientas no ven ningún enlace al panel, y aunque alguien llegue a esa página, solo los correos autorizados pueden guardar cambios.

---

## Uso diario

| Quiero… | Pasos |
|---|---|
| Cambiar un precio o las unidades | **Productos** → **Editar** → cambia el número → **Guardar cambios** |
| Agregar un producto | **Productos** → **+ Nuevo producto** → nombre, precio, unidades y al menos una foto → **Guardar** |
| Cambiar o agregar fotos | **Editar** → **+ Agregar fotos** (puedes tomarla con el celular). Se recortan y optimizan solas. Con **Principal** eliges la foto de portada |
| Poner un producto en oferta | **Editar** → escribe el porcentaje en **Descuento %**. Si anuncias la oferta, di hasta cuándo es válida |
| Ocultar un producto sin borrarlo | **Editar** → desmarca **Mostrar en la tienda** |
| Cambiar el orden en la tienda | **Productos** → flechas ↑ ↓ |
| Agregar tonos | **Editar** → **+ Agregar tono** → nombre, color y familia |
| Cambiar “Cómo usarlo” o el consejo | **Editar** → sección **Textos** (un paso por línea) |
| Cambiar WhatsApp, medios de pago, envíos o cupones | **Datos de la tienda** → **Guardar datos** |
| Ver mensajes del formulario de contacto | **Mensajes** |
| Descargar la prueba de autorizaciones | **Autorizaciones** → **Descargar todo** |

Los cambios se ven en la tienda apenas guardas (recarga la página de la tienda).

---

## Pasarle la tienda a otra persona

1. En **Administradoras**, escribe el correo de la nueva persona y pulsa **Agregar**.
2. La nueva persona abre `admin.html`, elige **Es mi primera vez: crear mi acceso**, escribe ese mismo correo y una contraseña, y confirma desde el enlace que le llega al correo.
3. Cuando ya pueda entrar, **quita tu correo** de la lista.
4. La nueva persona debe actualizar en **Datos de la tienda** su nombre o razón social, NIT, dirección, teléfono y correos.
5. Pásale también la cuenta de **Supabase** (ver abajo, “Dueña de las cuentas”).

La tienda no permite quedarse sin administradora: siempre debe quedar al menos una.

¿Olvidaste la contraseña? En la pantalla de entrada: **Olvidé mi contraseña**.

---

## Instalación (una sola vez)

Esto lo hace quien instala la tienda. Tarda unos 15 minutos.

1. Crea una cuenta gratis en **supabase.com** con el **correo de la tienda** (no uno personal), y crea un proyecto nuevo. Región sugerida: *South America (São Paulo)*.
2. En el proyecto: **SQL Editor** → **New query**. Abre el archivo `supabase/setup.sql`, cambia `CORREO_DE_LA_ADMINISTRADORA` por el correo real de la administradora, pégalo completo y pulsa **Run**.
3. **Authentication** → **URL Configuration**: en **Site URL** pon la dirección de `admin.html` de tu tienda, y agrégala también en **Redirect URLs**. Así los enlaces de confirmación y de “olvidé mi contraseña” llevan al panel.
4. **Project Settings** → **API**: copia **Project URL** y la clave **anon public**. Pégalas en `public/assets/js/config.js`, en la línea `supabase: { url: '...', anonKey: '...' }`. Esas dos son públicas. **Nunca** uses ni compartas la clave **service_role**.
5. Publica ese cambio (unir a `main` en GitHub).
6. La administradora entra a `admin.html` → **Es mi primera vez: crear mi acceso** → confirma su correo → entra → en **Productos** pulsa **Copiar los productos actuales** → en **Datos de la tienda** completa sus datos legales y guarda.

Listo: desde ahí todo se maneja desde el panel.

### Dueña de las cuentas

Para que el negocio no dependa de una persona:
- **Supabase:** créalo con el correo de la tienda. Para cambiar de dueña: *Organization → Team → Invite* con el correo nuevo como **Owner**, y luego quita a la anterior.
- **GitHub** (donde está el código): *Settings → Transfer ownership* al usuario de la nueva administradora. Después de instalar el panel ya no hace falta entrar a GitHub para el día a día.

---

## Plan gratuito de Supabase

Alcanza de sobra para una tienda pequeña. Si el proyecto no tiene actividad por una semana, Supabase lo pausa; la tienda sigue mostrando los productos de `data/products.json` y basta con entrar a supabase.com y pulsar **Restore**. Para evitarlo, entra al panel al menos una vez por semana.
