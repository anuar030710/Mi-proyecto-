# Sole Store — tienda online de maquillaje

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

Todo está en **`public/data/products.json`**. Cada producto tiene:

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
4. Conecta pagos y base de datos (abajo) y pon `demoMode: false`.
5. Cambia `TU-DOMINIO.co` en `robots.txt` y `sitemap.xml`.
6. Publica con HTTPS (Render, Railway o un VPS para `server.js`).

## 5. Conectar pagos reales

La tienda **nunca** debe pedir datos de tarjeta: los pide la pasarela. El flujo es igual en todas:

1. En `checkout.js` → `placeOrder()`, en vez de guardar el pedido en el navegador, envíalo a tu servidor (`POST /api/orders`).
2. El servidor **recalcula el total con los precios de `products.json`** (nunca confíes en el total que manda el navegador), guarda el pedido como “pendiente” y crea el pago en la pasarela con tu llave **secreta** (guárdala en una variable de entorno, nunca en `config.js`).
3. Rediriges a la persona a la pasarela.
4. La pasarela avisa a tu servidor por **webhook** si el pago se aprobó. Verifica la firma del webhook y solo entonces marca el pedido como pagado y descuenta stock.

| Pasarela | Ideal para | Métodos en Colombia | Cómo |
|---|---|---|---|
| **Wompi** (Bancolombia) | Empezar en Colombia | Tarjeta, PSE, Nequi, Bancolombia, efectivo | Widget o Web Checkout con firma de integridad (SHA-256 de referencia + monto en centavos + moneda + secreto). Webhook de eventos `transaction.updated`. |
| **Mercado Pago** | Vender también en otros países de Latinoamérica | Tarjeta, PSE, Efecty | Crear una “preferencia” con la API de Checkout Pro y redirigir a `init_point`. Notificaciones IPN/webhooks. |
| **Stripe** | Ventas internacionales en USD | Tarjeta (no PSE ni Nequi) | Stripe Checkout Session + webhook `checkout.session.completed`. Revisa la disponibilidad para cuentas colombianas. |

Recomendación: **Wompi** para clientas en Colombia (PSE y Nequi son clave).

## 6. Conectar una base de datos

Ahora mismo las cuentas y pedidos viven en el navegador (`auth.js`) y los consentimientos en archivos `.jsonl`. Para producción:

- **Opción simple:** [Supabase](https://supabase.com) (PostgreSQL + login + almacenamiento de fotos). Tablas: `products`, `orders`, `order_items`, `customers`, `consents`, `contact_messages`. Usa su autenticación en vez de `auth.js` y Row Level Security para que cada clienta solo lea sus pedidos.
- **Opción con tu servidor:** Node + PostgreSQL. Agrega endpoints `/api/products`, `/api/orders`, `/api/auth/*` a `server.js` (o migra a Express) y cambia `loadProducts()` para leer de `/api/products`.
- Haz que la tabla `consents` **solo permita insertar** (sin actualizar ni borrar): así sirve como prueba.
- Si quieres un panel para editar productos sin tocar JSON: Supabase Studio, o un CMS como Strapi o Directus.

## 7. Qué incluye

Inicio (banner, categorías, más vendidos, ofertas, reseñas, boletín) · Catálogo con filtros y orden · Ficha con galería y zoom, tonos, stock bajo, reseñas y relacionados · Carrito lateral con contador y barra de envío gratis · Carrito con cupones · Checkout con 4 medios de pago · Confirmación con número de pedido · Cuenta (registro, login, pedidos, favoritos, descarga y borrado de datos) · Contacto/PQR, FAQ, envíos, reembolsos, términos, privacidad y cookies · Buscador con sugerencias · WhatsApp flotante · Banner de cookies · SEO básico (títulos, descripciones, `robots.txt`, `sitemap.xml`, datos estructurados de producto) · Navegación con teclado, contraste AA y respeto a “reducir movimiento”.
