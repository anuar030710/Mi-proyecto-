# Soles Store — tienda online de maquillaje

Tienda completa en **HTML + CSS + JavaScript puro** (sin frameworks ni compilación). Funciona en celular primero, es accesible y trae las páginas legales para Colombia.

> Está en **modo demostración**: no cobra ni despacha. Antes de vender lee `docs/CUMPLIMIENTO-LEGAL.md`.

## 1. Cómo ejecutarla

Solo necesitas [Node.js 18 o superior](https://nodejs.org). No hay que instalar nada más.

```bash
cd sole-store
node server.js        # o: npm start
```

Abre **http://localhost:3000**.

> No abras los `.html` con doble clic: el navegador bloquea la carga de `data/products.json` desde `file://`. Usa siempre el servidor.

El servidor también guarda:
- `private/consent-log.jsonl`: la prueba de cada autorización (una línea por aceptación).
- `private/contact-messages.jsonl`: los mensajes del formulario de contacto.

La carpeta `private/` no se publica en la web y está en `.gitignore`, así que nunca se sube al repositorio.

## 2. Estructura

```
sole-store/
├── server.js                  Servidor: archivos estáticos + /api/consent + /api/contact
├── docs/                      Revisión legal y registro de imágenes
├── private/                   Registros con datos personales (no públicos)
└── public/                    LA TIENDA
    ├── *.html                 Una página por archivo (inicio, catálogo, producto, carrito…)
    ├── data/products.json     ← LOS PRODUCTOS
    └── assets/
        ├── css/styles.css     Estilos (colores y fuentes arriba, en :root)
        ├── img/               Imágenes
        └── js/
            ├── config.js      ← NOMBRE, MONEDA, ENVÍOS, CUPONES, WHATSAPP, DATOS LEGALES
            ├── utils.js       Precios, almacenamiento, accesibilidad
            ├── products.js    Precio final, etiquetas (Nuevo, Oferta, Agotado)
            ├── store.js       Carrito, cupones, totales y favoritos (localStorage)
            ├── consent.js     Casillas, registro de aceptaciones y banner de cookies
            ├── forms.js       Campos y validación con mensajes claros
            ├── auth.js        Cuentas y pedidos (versión demo en el navegador)
            ├── components/    Header/footer, carrito lateral, tarjeta de producto
            └── pages/         La lógica de cada página
```

## 3. Cambiar productos, precios y fotos

Lo más fácil es el **panel de administración** (sección 6). Sin panel, todo está en **`public/data/products.json`**. Cada producto tiene:

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Código único | `"p013"` |
| `slug` | Nombre para la URL, sin tildes ni espacios | `"labial-satin-rosa"` |
| `name`, `brand` | Nombre y marca | |
| `category` | `labiales`, `rubores`, `contorno`, `correctores`, `polvos`, `fijadores`, `cejas`, `delineadores`, `mascaras`, `brochas`, `accesorios` (se cambian en `CATEGORIES` de `config.js`) | |
| `price` | Precio **con IVA**, sin puntos | `59900` |
| `discount` | % de descuento (0 = sin oferta) | `15` |
| `tones` | Tonos: `name`, `hex` (color) y `family` (para el filtro) | |
| `skinTypes` | `seca`, `grasa`, `mixta`, `normal`, `sensible` | |
| `stock` | Unidades. `0` = Agotado; 6 o menos = “Últimas unidades” | |
| `sold` | Unidades vendidas (orden “Más vendidos”) | |
| `createdAt` | Fecha de alta. Menos de 45 días = etiqueta “Nuevo” | `"2026-11-20"` |
| `image`, `thumb`, `images` | Foto grande (1000×1250), miniatura para tarjetas (400×500) y galería (la 2.ª foto aparece al pasar el mouse) | |
| `variantLabel` | Opcional: cambia la palabra “Tono” (p. ej. “Versión”) | |
| `description`, `ingredients`, `howToUse` | Textos de la ficha | |
| `nso` | Notificación Sanitaria del INVIMA | |
| `reviews` | Reseñas reales verificadas (empieza vacío) | |

**Fotos:** guárdalas en `public/assets/img/products/` en formato vertical 4:5 (WebP o JPG, menos de 200 KB; [Squoosh](https://squoosh.app) las comprime gratis) y pon las rutas en `image`, `thumb` e `images`. Para que se vean mejor, fotografía cada producto solo, de cerca y con buena luz. Anota cada foto en `docs/DERECHOS-IMAGENES.md`.

**Precios, envío gratis, cupones, WhatsApp, moneda:** en `public/assets/js/config.js`. Para dólares: `currency: 'USD'`, `locale: 'en-US'`, `decimals: 2`.

**Colores y fuentes:** variables al inicio de `styles.css` (`--rose-200` rosa palo, `--gold-500` dorado, etc.).

## 4. Antes de publicar (lista corta)

1. Completa `company` en `config.js` (razón social, NIT, dirección, teléfono). Mientras falten, aparecen resaltados en amarillo.
2. Revisa los textos legales con un abogado y ajusta `policyVersions` cuando los cambies.
3. Pon los **precios y el stock reales** (los actuales son provisionales) y los números `nso` del INVIMA.
4. Pon `demoMode: false` cuando precios, stock y datos legales sean los reales.
5. Si cambias la dirección de la tienda, actualízala en `robots.txt` y `sitemap.xml`.
6. La tienda se publica sola en **https://soles-store.web.app** (Firebase Hosting) cada vez que un cambio llega a `main`. Configuración: `firebase.json`, `.firebaserc` y `.github/workflows/sole-store-firebase.yml`; pasos en `docs/GUIA-ADMINISTRADORA.md`.

## 5. Pagos: por WhatsApp

La página **no cobra**. Al finalizar la compra, la clienta ve su número de pedido y un botón **"Enviar pedido por WhatsApp"** que abre el chat con la tienda con todo el pedido escrito (productos, tonos, total, dirección y factura). El pago se acuerda en esa conversación.

- El número de WhatsApp está en `config.js` (`whatsapp.number`).
- El texto del mensaje se arma en `assets/js/whatsapp.js`.
- Nunca pidas por WhatsApp claves, códigos de verificación ni datos completos de tarjetas.

Si algún día quieres cobrar en la página, las opciones en Colombia son **Wompi** (tarjeta, PSE, Nequi), **Mercado Pago** o **Stripe** (para ventas en dólares). Eso requiere un servidor que recalcule el total y reciba la confirmación del pago.

## 6. Panel de administración (editar sin código)

`admin.html` es un panel para que la administradora cambie productos, precios, unidades (por tono), fotos, textos, WhatsApp, datos legales, envíos y cupones, y atienda pedidos. Todo funciona con **Firebase gratis** (sin tarjeta):

- **Firestore**: productos, inventario, pedidos, ajustes, autorizaciones y mensajes. Las fotos se guardan reducidas dentro de Firestore (no se usa Storage).
- **Authentication**: acceso con correo y contraseña. Solo los correos de la colección `admins` (con correo confirmado) pueden editar.
- **Reglas de seguridad**: `firestore.rules`. Una clienta solo puede descontar unidades creando un pedido en la misma operación, y nunca por debajo de 0. Las autorizaciones no se pueden borrar.
- **Código**: `assets/js/firebase.js` (sin librerías externas) y `assets/js/pages/admin.js`.
- Instalación y uso: **`docs/GUIA-ADMINISTRADORA.md`**.
- Si Firebase no está configurado, la tienda usa `data/products.json` (sin descuento de inventario).

## 7. Qué incluye

Inicio (banner, categorías, más vendidos, ofertas, reseñas, boletín) · Catálogo con filtros y orden · Ficha con galería y zoom, tonos, stock bajo, reseñas y relacionados · Carrito lateral con contador y barra de envío gratis · Carrito con cupones · Checkout con envío del pedido por WhatsApp · Confirmación con número de pedido · Cuenta (registro, login, pedidos, favoritos, descarga y borrado de datos) · Contacto/PQR, FAQ, envíos, reembolsos, términos, privacidad y cookies · Buscador con sugerencias · WhatsApp flotante · Banner de cookies · SEO básico (títulos, descripciones, `robots.txt`, `sitemap.xml`, datos estructurados de producto) · Navegación con teclado, contraste AA y respeto a “reducir movimiento”.
