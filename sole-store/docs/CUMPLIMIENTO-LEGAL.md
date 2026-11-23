# Revisión legal de Sole Store (Colombia)

**Fecha de revisión:** 22 de noviembre de 2026 · **Alcance:** venta online a consumidores en Colombia.

> Esto es una revisión técnica hecha al construir la tienda, **no es asesoría legal**. Las normas cambian y dependen de tu caso (persona natural o empresa, tamaño, si vendes fuera de Colombia). Pide a un abogado que revise los textos antes de vender. Los puntos marcados **[TÚ]** solo los puedes resolver tú.

## 1. Estado por punto solicitado

| # | Pedido | Estado | Dónde |
|---|---|---|---|
| 1 | Términos y condiciones | Hecho (modelo) | `terminos.html` |
| 2 | Política de privacidad | Hecho (modelo, con el contenido que exige el Decreto 1377/2013) | `privacidad.html` |
| 3 | Política de cookies + ¿necesito consentimiento? | Hecho. Ver §3 | `cookies.html`, banner en todas las páginas |
| 4 | Dos casillas separadas en cada formulario | Hecho. Ver §4 | `consent.js` |
| 5 | Registro de cuándo y cómo aceptó cada persona | Hecho. Ver §5 | `server.js` → `private/consent-log.jsonl` |
| 6 | Política de reembolso | Hecho (incluye retracto, garantía y reversión del pago) | `reembolsos.html` |
| 7 | Pedir solo los datos necesarios | Hecho. Ver §6 | Formularios |
| 8 | Derechos de cada imagen | Revisado: 6 fotos propias, 10 por confirmar. Ver §7 y `DERECHOS-IMAGENES.md` | **[TÚ]** |
| 9 | Leyes locales | Revisado. Ver §2. Hay pendientes **[TÚ]** | |

## 2. Normas que aplican y cómo las cubre la tienda

| Norma | Qué exige | Cómo se cumple | Pendiente |
|---|---|---|---|
| **Ley 1480 de 2011 (Estatuto del Consumidor), art. 50** — comercio electrónico | Identidad del vendedor (razón social, NIT, dirección, teléfono, correo); info clara del producto; precio total con impuestos y envío; resumen del pedido; medios para PQR; entrega en máximo 30 días si no se pacta otra cosa | Footer y legales muestran los datos desde `config.js`; ficha con ingredientes, uso y NSO; precios con IVA; envío visible antes de pagar; confirmación con número de pedido; formulario PQR; plazo de 30 días en términos | **[TÚ]** Completar `company` en `config.js`. **[TÚ]** Enviar de verdad el correo de confirmación (requiere backend) |
| **Ley 1480, art. 26** | Precio con IVA incluido | “IVA incluido” en ficha, carrito y footer | — |
| **Ley 1480, art. 33** y Circular Única SIC — promociones | Indicar vigencia y unidades disponibles | Texto de la promo en inicio con fechas; stock visible en cada producto; condiciones de cupones en términos | **[TÚ]** Actualizar fechas cada vez que cambies una promo |
| **Ley 1480, art. 47** — retracto | 5 días hábiles, con excepciones (bienes de uso personal) | Los cosméticos son de uso personal → se explica la excepción y se ofrece devolución **voluntaria** de productos sellados | Decide si mantienes la devolución voluntaria |
| **Ley 1480, art. 51 y Decreto 1074/2015** — reversión del pago | Informar el derecho y el procedimiento | `reembolsos.html#reversion`, enlazado desde términos, checkout y confirmación | **[TÚ]** Proceso interno para atenderlas en los plazos legales |
| **Ley 1480, arts. 7–18 y Decreto 735/2013** — garantía | Garantía legal mínima | Explicada en `reembolsos.html` | — |
| **Ley 1480 y Ley 2300 de 2023** — publicidad engañosa y contacto | Reseñas y afirmaciones veraces; contactar solo en horarios y canales permitidos | El catálogo empieza sin reseñas ni calificaciones; las descripciones solo dicen lo que muestra el empaque; marketing solo con casilla aceptada | **[TÚ]** Publicar solo reseñas de clientas reales. Enviar marketing solo lun–vie 7 a. m.–7 p. m. y sáb 8 a. m.–3 p. m., nunca domingos ni festivos |
| **Circular Única SIC** | Enlace visible a la SIC en tiendas online | Enlace a www.sic.gov.co en el footer de todas las páginas | — |
| **Ley 1581/2012, Decreto 1377/2013 (Dec. 1074/2015)** — datos personales | Política con contenido mínimo; autorización previa, expresa e informada; **conservar prueba**; atender consultas (10 días hábiles) y reclamos (15 días hábiles) | Política completa; casillas sin marcar; registro de prueba; descarga y borrado de datos en “Mi cuenta”; plazos en la política | **[TÚ]** Revisar si debes inscribir tus bases de datos en el **RNBD de la SIC** (obligatorio para sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT — Decreto 090 de 2018). **[TÚ]** Firmar contratos de encargo con pasarela, transportadora y hosting |
| **Ley 527 de 1999** — comercio electrónico | Validez de los mensajes de datos y la aceptación electrónica | La aceptación por casilla queda registrada con fecha, texto y versión | — |
| **Decisión Andina 833 de 2018 e INVIMA** — cosméticos | Cada cosmético debe tener Notificación Sanitaria Obligatoria (NSO) y etiquetado en español | Campo `nso` en cada producto, visible en la ficha | **[TÚ]** Reemplazar los NSO de ejemplo por los reales; vender solo productos con NSO vigente |
| **DIAN** — facturación electrónica | Emitir factura electrónica | El checkout pide documento solo si la persona quiere factura a su nombre (si no, “consumidor final”) | **[TÚ]** Contratar un proveedor de facturación electrónica |
| **Cámara de Comercio y RUT** | Registro mercantil y RUT | — | **[TÚ]** |

**Si vendes a clientas en la Unión Europea** también aplican el RGPD y la Directiva ePrivacy (consentimiento previo de cookies, aviso de transferencias internacionales). El banner ya está preparado para eso.

## 3. Cookies: ¿necesitas consentimiento?

**Hoy no es obligatorio**, porque la tienda solo usa almacenamiento **estrictamente necesario** (carrito, favoritos, sesión y la propia elección de cookies) y no usa analítica ni publicidad. Aun así se dejó el banner porque:

- Informa con transparencia (exigencia de la Ley 1581 cuando hay datos asociados a una persona).
- **Sí necesitarás consentimiento en cuanto agregues** Google Analytics, Meta Pixel, TikTok Pixel o similares. Agrégalos solo en `CONFIG.optionalScripts` (`config.js`): así únicamente se cargan si la persona los acepta. Luego actualiza la tabla de `cookies.html`, sube `policyVersions.cookies` (el banner volverá a preguntar) y añade el dominio al CSP de `server.js`.
- “Rechazar” tiene el mismo peso visual que “Aceptar” y las categorías opcionales empiezan apagadas.

**Google Fonts:** cargar las fuentes desde Google envía la IP de la visitante a Google. Está declarado en la política de cookies. Si quieres eliminarlo, descarga las fuentes (Cormorant Garamond y Jost, licencia OFL) a `assets/fonts/` y cámbialo en el `<head>`.

## 4. Las dos casillas

Todo formulario que **recoge datos personales nuevos** muestra dos casillas separadas, **nunca premarcadas**:

1. **Obligatoria:** “He leído y acepto los Términos y condiciones y la Política de privacidad, y autorizo… para *[finalidad concreta de ese formulario]*”.
2. **Comunicaciones comerciales:** opcional en todos los formularios. En el boletín es obligatoria porque recibir correos es precisamente para lo que existe ese formulario.

| Formulario | Casilla 1 | Casilla 2 |
|---|---|---|
| Checkout | Obligatoria | Opcional |
| Crear cuenta | Obligatoria | Opcional |
| Contacto / PQR | Obligatoria | Opcional |
| Reseña | Obligatoria | Opcional |
| Boletín | Obligatoria | Obligatoria |
| Iniciar sesión, buscador, cupón, filtros | No aplica: no recogen datos nuevos | — |

## 5. Registro de aceptaciones

Cada envío genera un registro con: id único, formulario, **texto exacto** de cada casilla, si se marcó o no, **versión** de términos/privacidad vigente, fecha y hora del navegador **y del servidor**, **IP**, navegador, página y método (“marcó las casillas y pulsó el botón…”). También se registran: la elección de cookies (con un id anónimo), el retiro del permiso de marketing y la eliminación de la cuenta.

- Se guarda en `private/consent-log.jsonl` (una línea JSON por registro, solo se añade, nunca se modifica).
- Si el servidor no responde, el registro queda en cola en el navegador y se reenvía en la siguiente visita.
- Para encontrar la prueba de una persona: `grep 'correo@ejemplo.com' private/consent-log.jsonl`.
- **[TÚ]** Haz copias de seguridad de ese archivo. En producción pásalo a una tabla de base de datos que solo permita insertar.

## 6. Minimización de datos

| Formulario | Se pide | No se pide (a propósito) |
|---|---|---|
| Checkout | Correo, nombre, celular, departamento, ciudad, dirección (+ detalle opcional) | Documento (solo si pide factura a su nombre), fecha de nacimiento, género, datos de tarjeta (los pide la pasarela) |
| Cuenta | Nombre, correo, contraseña | Apellido, teléfono, dirección, cumpleaños |
| Contacto | Nombre, correo, motivo, mensaje (+ número de pedido opcional) | Teléfono, documento |
| Reseña | Nombre o apodo, calificación, opinión | Correo |
| Boletín | Correo | Nombre |

## 7. Imágenes

Ver `DERECHOS-IMAGENES.md`. En corto: las 6 fotos tomadas en tu tienda (con tu letrero) son tuyas. Las otras 10 parecen fotos promocionales de las marcas (Ani-K, Atenea, Bloomshell): **no puedo verificar sus derechos**; necesitas el permiso escrito de la marca o del distribuidor, o reemplazarlas por fotos tuyas. Los nombres de marca solo se usan para identificar los productos originales que revendes.
