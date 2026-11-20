# Inspirato Salma — página web

Tienda en HTML puro, sin servidor: catálogo → bolsa → pedido por WhatsApp al **314 502 6686**.

| Archivo | Para qué |
|---|---|
| `index.html` | Tienda (catálogo con inventario, bolsa, formulario de pedido) |
| `admin.html` | **Panel de administración** con contraseña: productos, fotos, precios, colores, inventario por talla, pedidos y datos de la tienda |
| `firebase-config.js` | Conexión con tu proyecto de Firebase |
| `config.js` | Catálogo inicial (y respaldo si Firebase no está conectado) |
| `../firestore.rules` | Reglas de seguridad: solo la administradora edita |
| `terminos.html`, `privacidad.html`, `cookies.html`, `reembolsos.html` | Páginas legales |

## Cómo se edita

Entra a **`/admin`** de tu página con tu correo y contraseña. Las clientas pueden ver esa
pantalla, pero sin tu contraseña no pueden ver pedidos ni cambiar nada: lo bloquean las reglas
de Firebase, no solo la página.

- **Productos** → toca uno → cambia foto, nombre, precio, colores, tallas e inventario → **Guardar**.
- **Pedidos** → cada pedido llega como *pendiente*. Cuando la clienta pague, toca **Confirmar venta**
  y se descuentan las unidades. **Anular venta** las devuelve. Una talla en 0 sale "agotada" y un
  producto con todas sus tallas en 0 sale "Agotado".
- **Tienda** → WhatsApp, medios de pago y datos legales.

## Configurar Firebase (una sola vez)

1. En console.firebase.google.com, crea el proyecto (plan gratis Spark, sin Analytics).
2. **Build → Firestore Database → Create database**, ubicación `nam5 (United States)`, modo producción.
3. **Build → Authentication → Get started → Email/Password → Enable**. En **Users → Add user**,
   crea tu cuenta de administradora. En **Settings → User actions**, desactiva *Enable create (sign-up)*.
4. **Configuración del proyecto (⚙️) → General → Tus apps → Web (`</>`)**: registra la app y copia
   el objeto `firebaseConfig`. Se pega en `firebase-config.js` (no es secreto).
5. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Descarga el
   `.json` y pega **todo su contenido** en GitHub → Settings → Secrets and variables → Actions →
   **New repository secret**, con el nombre `FIREBASE_SERVICE_ACCOUNT`. **Este sí es secreto: no lo
   compartas con nadie.**
6. Pon el ID del proyecto en `.firebaserc` y tu correo en `firestore.rules` (en lugar de `ADMIN_EMAIL`).

Desde entonces, cada cambio subido a GitHub se publica solo en `https://ID-DEL-PROYECTO.web.app`
(pestaña **Actions** de GitHub para ver si salió bien). Al entrar por primera vez al panel, toca
**Cargar catálogo actual** y pon el inventario de cada producto.

---

## Revisión de los 9 puntos pedidos

### 1. Términos y condiciones — `terminos.html` ✅
Identificación del vendedor, proceso de compra por WhatsApp, precios con impuestos, medios de pago,
reversión del pago (art. 51 Ley 1480), envíos (plazo máximo 30 días), edad mínima, PQRS y enlace a la SIC.

### 2. Política de privacidad — `privacidad.html` ✅
Cumple el contenido mínimo del Decreto 1377 de 2013 (art. 13): responsable, datos, finalidades,
derechos, procedimiento de consultas (10 días hábiles) y reclamos (15 días hábiles), vigencia.
Incluye el uso de WhatsApp/Meta y los límites de la Ley 2300 de 2023 para mensajes promocionales.

### 3. Política de cookies — `cookies.html` ✅ · ¿Necesitas consentimiento? **No, por ahora.**
- La página **no usa cookies**; solo guarda en el navegador la bolsa y la copia del registro de
  aceptación, y en el panel la sesión de la administradora (almacenamiento estrictamente necesario).
- Las fuentes están alojadas en tu sitio y no hay analítica ni píxeles. Firebase se usa solo para
  datos de la tienda, no para rastrear.
- Colombia no tiene ley específica de cookies; lo que aplica es la Ley 1581. Como no hay rastreo, no hace falta banner.
- **Si agregas Google Analytics, Meta Pixel, TikTok Pixel, etc., SÍ necesitarás** un aviso de
  consentimiento previo con opción de rechazar, y actualizar `cookies.html`.

### 4. Dos casillas separadas en cada formulario ✅
El único formulario que recoge datos es el de pedido. Tiene dos casillas **separadas, sin marcar y
obligatorias**: (1) Términos + reembolsos + mayoría de edad; (2) autorización de tratamiento de datos.
Los demás botones de WhatsApp solo abren el chat y no recogen datos en la página.

### 5. Registro de cuándo y cómo aceptó cada persona ✅
Cada pedido genera un registro con código único (`SAL-XXXXXXXX`), fecha y hora, método, texto exacto
de cada casilla y versión de cada documento. Queda en tres sitios:
1. **Dentro del mensaje de WhatsApp** que te llega (es tu prueba principal — no borres esos chats;
   exporta los chats o haz copia de seguridad).
2. En el navegador de la clienta (`salma_consentimientos`).
3. **En Firebase**, junto con el pedido: lo ves en el panel → Pedidos → "Registro de consentimiento".
4. (Alternativa sin Firebase) en una Google Sheet tuya. Pasos:
   - Crea una hoja en Google Sheets → Extensiones → Apps Script, y pega:
     ```js
     function doPost(e) {
       const r = JSON.parse(e.postData.contents);
       SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
         r.id, r.fecha, r.nombre, r.ciudad, r.metodo,
         r.aceptaTerminos.version, r.aceptaTerminos.texto,
         r.autorizaDatos.version, r.autorizaDatos.texto, r.pagina
       ]);
       return ContentService.createTextOutput("ok");
     }
     ```
   - Implementar → Nueva implementación → Aplicación web → Acceso: "Cualquier persona" → copia la URL.
   - Pégala en `config.js` → `urlRegistroConsentimiento`.

Si cambias el texto de los términos o de la privacidad, sube la versión (`1.0` → `1.1`) para saber
qué versión aceptó cada persona.

### 6. Política de reembolsos — `reembolsos.html` ✅
Retracto de 5 días hábiles (art. 47), devolución del dinero en máximo 30 días, excepción de prendas
íntimas inferiores por higiene (art. 47 num. 7, bienes de uso personal), cambios de talla, garantía
legal por defectos (configurable, por defecto 3 meses) y qué pasa si el pedido no llega.

### 7. Solo los datos necesarios ✅
El formulario pide **nombre y ciudad** (y una nota opcional). No pide cédula, correo, teléfono ni
dirección: el teléfono ya lo trae WhatsApp y la dirección se pide en el chat solo al confirmar la compra.

### 8. Derechos de las imágenes ⚠️ — revisa esto
**No pude verificar quién tomó las fotos.** Si las tomaste tú, son tuyas. Si vienen de un proveedor
o fabricante, pídele autorización por escrito (un WhatsApp o correo que diga que puedes usarlas para
vender sus prendas sirve como soporte).

**Excluí 4 fotos de la página** porque muestran personajes y marcas registradas de terceros. Para
venderlas necesitas licencia oficial (o que el proveedor demuestre que es mercancía licenciada); de lo
contrario puede haber reclamos por propiedad intelectual y la SIC/Policía Fiscal puede decomisar mercancía:

| Foto | Personaje / marca | Titular |
|---|---|---|
| Conjunto rojo/rosa con gatita y moño | Hello Kitty | Sanrio |
| Enterizo amarillo con ratona y patrón "GG" | Minnie Mouse + logo de Gucci | Disney + Gucci (Kering) |
| Enterizo fucsia con gatita blanca | Marie (Los Aristogatos) | Disney |
| Batola lila con ositos | Care Bears (Share Bear) | Cloudco Entertainment |

Las 12 fotos incluidas muestran diseños genéricos (corazones, aguacates, vaquitas, ovejitas,
gatitos, ositos genéricos). Aun así, confirma con tu proveedor que esos estampados no son copia
de diseños registrados.

### 9. Leyes locales (Colombia) ✅ con pendientes tuyos
| Norma | Qué exige | Estado |
|---|---|---|
| Ley 1480/2011 (Estatuto del Consumidor) art. 50 | Identidad, documento, dirección, teléfono, correo del vendedor | ⚠️ Completa `legal` en `config.js` |
| Ley 1480 art. 26 | Precio total con impuestos | ✅ Indicado en la página |
| Ley 1480 art. 47 | Retracto 5 días hábiles | ✅ |
| Ley 1480 art. 51 | Reversión del pago | ✅ |
| Ley 1480 arts. 7–8 | Garantía legal | ✅ |
| Ley 1581/2012 + Decreto 1377/2013 | Política de datos, autorización previa y prueba | ✅ |
| Ley 2300/2023 | Horarios y frecuencia de mensajes promocionales | ✅ en la política; cúmplelo al escribir a clientas |
| Ley 527/1999 | Validez de la aceptación electrónica | ✅ |
| Circular Única SIC | Enlace visible a la SIC | ✅ en el pie de página |
| Registro Nacional de Bases de Datos (RNBD) | Obligatorio solo para sociedades/entidades con activos > 100.000 UVT | Probablemente no aplica; confírmalo |
| DIAN — factura electrónica | Si eres responsable de IVA o superas los topes | ⚠️ Revísalo con tu contador |
| RUT / registro mercantil | Para comerciantes habituales | ⚠️ Revísalo con tu contador o Cámara de Comercio |

> Estos textos son una base sólida, pero no reemplazan asesoría legal. Si el negocio crece,
> pide a un abogado que los revise.
