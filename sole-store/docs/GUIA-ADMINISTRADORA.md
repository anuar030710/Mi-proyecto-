# Guía de la administradora — Soles Store

Con el **panel de administración** puedes cambiar tu tienda sin tocar código: productos, precios, unidades, fotos, textos, WhatsApp, datos legales, envíos y cupones.

**Dónde está:** **https://soles-store.web.app/admin.html**

La tienda para las clientas es **https://soles-store.web.app**

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
5. Pásale también el proyecto de **Firebase** (ver abajo, “Dueña de las cuentas”).

La tienda no permite quedarse sin administradora desde el panel: siempre debe quedar al menos una.

¿Olvidaste la contraseña? En la pantalla de entrada: **Olvidé mi contraseña**. Te llega un correo de Firebase con un enlace para crear una nueva; luego vuelve al panel y entra.

---

## Instalación (una sola vez)

Todo funciona con **Firebase, gratis y sin tarjeta**: Hosting (la página), Firestore (productos, inventario, pedidos y fotos) y Authentication (acceso de administradoras). No se usa Firebase Storage: las fotos se guardan reducidas dentro de Firestore.

**A. Crear el proyecto**
1. **console.firebase.google.com** → **Agregar proyecto** → nombre `Soles Store`. El ID del proyecto es `soles-store` (si no, avisa: hay que cambiarlo en `.firebaserc`, `config.js` y el archivo de publicación).
2. **Desactiva** Google Analytics.

**B. Base de datos (Firestore)**
1. **Compilación → Firestore Database → Crear base de datos** → modo **producción** → ubicación **southamerica-east1 (São Paulo)**.
2. Pestaña **Datos** → **Iniciar colección** → ID de la colección: `admins`.
   - ID del documento: el correo de la administradora **en minúsculas** (ej.: `nombre.apellido@gmail.com`).
   - Campo: `email` (tipo string) con ese mismo correo → **Guardar**.
   - Repite con **Agregar documento** para cada administradora inicial. Las siguientes se agregan desde el panel.

**C. Inicio de sesión (Authentication)**
1. **Compilación → Authentication → Comenzar** → **Correo electrónico/contraseña** → **Habilitar** (solo la primera opción) → **Guardar**.

**D. Conectar la página**
1. ⚙️ **Configuración del proyecto → General → Tus apps** → ícono **`</>`** (Web) → apodo `tienda` → **Registrar app** (no marques Hosting).
2. Copia el valor de **apiKey** y pégalo en `public/assets/js/config.js`, en la línea `firebase: { apiKey: '...', projectId: 'soles-store' }`. Es un dato público: es seguro que esté en el código.

**E. Publicación automática** (ver “Publicación” abajo) y unir los cambios a `main`.

**F. Primer ingreso**
La administradora entra a `https://soles-store.web.app/admin.html` → **Es mi primera vez: crear mi acceso** → confirma su correo desde el enlace que le llega → entra → en **Productos** pulsa **Copiar los productos actuales** → en **Datos de la tienda** completa sus datos legales y guarda.

Listo: desde ahí todo se maneja desde el panel.

### Dueña de las cuentas

Para que el negocio no dependa de una persona:
- **Firebase:** ⚙️ **Configuración del proyecto → Usuarios y permisos → Agregar miembro** con el correo nuevo como **Propietario**; luego quita al anterior y genera una **clave privada nueva** para GitHub (ver “Publicación”).
- **GitHub** (donde está el código): *Settings → Transfer ownership* al usuario de la nueva administradora. Después de instalar el panel ya no hace falta entrar a GitHub para el día a día.

### Publicación en soles-store.web.app

Cada cambio en el código que llega a la rama `main` publica sola la **página** (archivo `.github/workflows/sole-store-firebase.yml`). Para eso GitHub necesita una clave de Firebase guardada como secreto:

1. Firebase → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo `.json`.
2. GitHub → repositorio → **Settings → Secrets and variables → Actions → New repository secret**. Nombre: `FIREBASE_SERVICE_ACCOUNT_SOLESSTORE`. Valor: pega **todo** el contenido del archivo.
3. Borra el archivo descargado de tu computador. Esa clave nunca se comparte por chat ni correo.

**Reglas de seguridad (una sola vez, y cada vez que cambie `firestore.rules`):** la clave que genera Firebase no tiene permiso para publicarlas, así que se pegan a mano:
1. Abre `sole-store/firestore.rules` en GitHub y cópialo completo (botón de copiar).
2. Firebase → **Firestore Database → Reglas** → borra lo que hay, pega → **Publicar**.

(Opcional, para que también se publiquen solas: en Google Cloud → **IAM**, darle a la cuenta `firebase-adminsdk-…` el rol **Firebase Rules Admin**.)

Los cambios hechos desde el panel (productos, precios, unidades, fotos, datos) **no** necesitan esto: se ven al instante.

---

## Límites del plan gratuito de Firebase

Alcanzan de sobra para una tienda pequeña: unas 50.000 lecturas y 20.000 escrituras de la base de datos por día. Cada visita a una página de la tienda usa unas 30 lecturas, es decir, más de 1.500 visitas diarias gratis. Firebase no pausa el proyecto por inactividad.

Fotos: hasta **4 por producto**, guardadas reducidas (800 × 1000 px). Lo ideal es una foto clara del producto solo, con buena luz.
