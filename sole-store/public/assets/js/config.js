/**
 * Soles Store — Configuración central.
 * Casi todo lo que una dueña de tienda necesita cambiar está aquí.
 */
export const CONFIG = {
  /* Firebase (panel de administración, inventario y pedidos). Se llena UNA sola vez con la
     "configuración web" del proyecto: Firebase → ⚙️ Configuración del proyecto → General →
     Tus apps → app web. Estos datos son públicos: es seguro que estén aquí.
     Si apiKey está vacía, la tienda usa data/products.json y el panel no funciona. */
  firebase: { apiKey: 'AIzaSyAFhnH0a0clWVEhkvuvasy5afBJ8Ka-aDw', projectId: 'soles-store' },

  /* Todo lo de abajo son valores por defecto: la administradora los cambia desde el panel. */
  storeName: 'Soles Store',
  tagline: 'Tu luz, a tu manera',

  /* Modo demostración: muestra una barra avisando que no se procesan pagos reales.
     Pon false cuando los precios, el stock y los datos legales sean los reales. */
  demoMode: false,

  /* Moneda. Para dólares: currency 'USD', locale 'en-US', decimals 2. */
  currency: 'COP',
  locale: 'es-CO',
  decimals: 0,

  /* Envío gratis desde este monto (en la moneda de arriba). */
  freeShippingFrom: 150000,

  /* Unidades a partir de las cuales se muestra "¡Quedan pocas!" */
  lowStockThreshold: 6,

  /* Envíos (se cambian desde el panel). Ver assets/js/shipping.js.
     - Nacional: rango según la ciudad; el valor exacto se confirma por WhatsApp.
     - Domicilio local: localPrice = null → "por confirmar", 0 → gratis, o un valor. */
  shipping: { nationalMin: 18500, nationalMax: 21000, localCity: 'Caucasia', localDepartment: 'Antioquia', localPrice: null },

  /* Pagos: NO se hacen en la página. Al confirmar, la clienta envía su pedido por WhatsApp
     y el pago se acuerda en esa conversación (ver assets/js/whatsapp.js).
     Medios aceptados (se muestran en la página; los datos de la cuenta se envían por WhatsApp): */
  paymentOptions: ['Nequi', 'Bancolombia'],

  /* Cupones de ejemplo. type: 'percent' | 'fixed' | 'shipping' */
  coupons: {
    BIENVENIDA10: { type: 'percent', value: 10, label: '10% de descuento de bienvenida' },
    SOLE20K: { type: 'fixed', value: 20000, minSubtotal: 120000, label: '$20.000 de descuento en compras desde $120.000' },
    ENVIOGRATIS: { type: 'shipping', label: 'Envío gratis' },
  },

  /* WhatsApp: número en formato internacional sin "+" ni espacios. */
  whatsapp: { number: '573054556549', message: 'Hola Soles Store, tengo una pregunta sobre un producto.' },

  /* Datos legales del comercio (Ley 1480 de 2011, art. 50, y Ley 1581 de 2012).
     OBLIGATORIO completarlos antes de publicar. Se muestran en el footer y en las políticas. */
  company: {
    legalName: '',          // Razón social o nombre de la persona natural. Ej.: 'Soles Store S.A.S.'
    nit: '',                // NIT con dígito de verificación. Ej.: '900.000.000-0'
    address: '',            // Dirección física de notificaciones
    city: 'Bogotá D.C., Colombia',
    phone: '',              // Teléfono de atención
    email: 'hola@solesstore.co',
    privacyEmail: 'datos@solesstore.co',   // Correo para ejercer derechos de habeas data
    hours: 'Lunes a viernes de 8:00 a. m. a 6:00 p. m.; sábados de 9:00 a. m. a 1:00 p. m.',
  },

  /* Versiones de los documentos legales. Súbelas cuando cambies el texto:
     así cada aceptación registrada indica qué versión aceptó la persona. */
  policyVersions: {
    terms: '1.2 (2026-11-23)',
    privacy: '1.2 (2026-11-23)',
    cookies: '1.1 (2026-11-23)',
    refunds: '1.2 (2026-11-23)',
  },

  /* Scripts opcionales que SOLO se cargan si la persona acepta esa categoría de cookies.
     Ej.: analytics: ['https://www.googletagmanager.com/gtag/js?id=G-XXXX'] */
  optionalScripts: { analytics: [], marketing: [] },

  /* Endpoint del servidor que guarda el registro de consentimientos (server.js). */
  consentEndpoint: '/api/consent',
  contactEndpoint: '/api/contact',
};

/* Nombres legibles de categorías, tipos de piel y familias de tono. */
export const CATEGORIES = {
  labiales: 'Labiales', rubores: 'Rubores', iluminadores: 'Iluminadores', contorno: 'Contorno', correctores: 'Correctores', polvos: 'Polvos',
  fijadores: 'Fijadores', cejas: 'Cejas', delineadores: 'Delineadores', mascaras: 'Máscaras de pestañas',
  brochas: 'Brochas', accesorios: 'Esponjas y accesorios',
};
export const SKIN_TYPES = { seca: 'Seca', grasa: 'Grasa', mixta: 'Mixta', normal: 'Normal', sensible: 'Sensible' };
export const TONE_FAMILIES = {
  nude: { label: 'Nude', hex: '#D9A98F' }, rosa: { label: 'Rosa', hex: '#E58C9C' }, rojo: { label: 'Rojo', hex: '#A3212F' },
  coral: { label: 'Coral', hex: '#EE8170' }, malva: { label: 'Malva', hex: '#9B5A6F' }, marron: { label: 'Marrón', hex: '#7A4E31' },
  negro: { label: 'Negro', hex: '#1D1719' }, dorado: { label: 'Dorado', hex: '#D8B66A' },
};
