# Guía de la administradora — Soles Store

Con el **panel de administración** puedes cambiar tu tienda sin tocar código: productos, precios, unidades, fotos, textos, WhatsApp, datos legales, envíos y cupones.

**Dónde está:** **https://solesstore.web.app/admin.html**

La tienda para las clientas es **https://solesstore.web.app**

Las clientas no ven ningún enlace al panel, y aunque alguien llegue a esa página, solo los correos autorizados pueden guardar cambios.

---

## Uso diario

| Quiero… | Pasos |
|---|---|
| Cambiar un precio | **Productos** → **Editar** → cambia el número → **Guardar cambios** |
| Cambiar las unidades (inventario) | **Productos** → **Editar** → usa **−** y **+**. Si el producto tiene tonos, cada tono tiene sus propias unidades |
| Ver y atender pedidos | **Pedidos** → escribe a la clienta con el botón de WhatsApp → **Marcar pagado** → **Marcar enviado** |
| Un pedido no se concretó | **Pedidos** → **Cancelar y devolver unidades** |
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

## Cómo funciona el inventario

- Cada producto (o cada tono) tiene sus **unidades**.
- Cuando una clienta envía su pedido, las unidades **se descuentan solas**.
- Si un tono llega a 0, ese tono aparece **Agotado** y no se puede elegir. Si se agotan todos, el producto completo sale **Agotado**.
- La tienda no deja pedir más unidades de las que hay, aunque dos personas compren al mismo tiempo.
- Si un pedido no se paga o no se concreta, **cancélalo** en **Pedidos**: las unidades vuelven solas.
- Cuando llegue mercancía nueva, súmala con **+** en el producto.

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
3. **Authentication** → **URL Configuration**: en **Site URL** pon `https://solesstore.web.app/admin.html` y agrégala también en **Redirect URLs**. Así los enlaces de confirmación y de “olvidé mi contraseña” llevan al panel.
4. **Project Settings** → **API**: copia **Project URL** y la clave **anon public**. Pégalas en `public/assets/js/config.js`, en la línea `supabase: { url: '...', anonKey: '...' }`. Esas dos son públicas. **Nunca** uses ni compartas la clave **service_role**.
5. Publica ese cambio (unir a `main` en GitHub). La tienda se actualiza sola en solesstore.web.app en 1 o 2 minutos.
6. La administradora entra a `admin.html` → **Es mi primera vez: crear mi acceso** → confirma su correo → entra → en **Productos** pulsa **Copiar los productos actuales** → en **Datos de la tienda** completa sus datos legales y guarda.

Listo: desde ahí todo se maneja desde el panel.

### Dueña de las cuentas

Para que el negocio no dependa de una persona:
- **Supabase:** créalo con el correo de la tienda. Para cambiar de dueña: *Organization → Team → Invite* con el correo nuevo como **Owner**, y luego quita a la anterior.
- **Firebase** (donde se publica la página): ⚙️ **Configuración del proyecto → Usuarios y permisos → Agregar miembro** con el correo nuevo como **Propietario**; luego quita al anterior y genera una **clave privada nueva** (ver “Publicación”).
- **GitHub** (donde está el código): *Settings → Transfer ownership* al usuario de la nueva administradora. Después de instalar el panel ya no hace falta entrar a GitHub para el día a día.

### Publicación en solesstore.web.app

Cada cambio en el código que llega a la rama `main` se publica solo en Firebase Hosting (archivo `.github/workflows/sole-store-firebase.yml`). Para eso GitHub necesita una clave de Firebase guardada como secreto:

1. Firebase → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo `.json`.
2. GitHub → repositorio → **Settings → Secrets and variables → Actions → New repository secret**. Nombre: `FIREBASE_SERVICE_ACCOUNT_SOLESSTORE`. Valor: pega **todo** el contenido del archivo.
3. Borra el archivo descargado de tu computador. Esa clave nunca se comparte por chat ni correo.

Los cambios hechos desde el panel (productos, precios, unidades, datos) **no** necesitan esto: se ven al instante.

---

## Plan gratuito de Supabase

Alcanza de sobra para una tienda pequeña. Si el proyecto no tiene actividad por una semana, Supabase lo pausa; la tienda sigue mostrando los productos de `data/products.json` y basta con entrar a supabase.com y pulsar **Restore**. Para evitarlo, entra al panel al menos una vez por semana.
