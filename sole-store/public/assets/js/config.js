/**
 * Sole Store — Configuración central.
 * Casi todo lo que una dueña de tienda necesita cambiar está aquí.
 */
export const CONFIG = {
  storeName: 'Sole Store',
  tagline: 'Tu luz, a tu manera',

  /* Modo demostración: muestra una barra avisando que no se procesan pagos reales.
     Pon false SOLO cuando hayas conectado una pasarela de pago y un backend. */
  demoMode: true,

  /* Moneda. Para dólares: currency 'USD', locale 'en-US', decimals 2. */
  currency: 'COP',
  locale: 'es-CO',
  decimals: 0,

  /* Envío gratis desde este monto (en la moneda de arriba). */
  freeShippingFrom: 150000,

  /* Unidades a partir de las cuales se muestra "¡Quedan pocas!" */
  lowStockThreshold: 6,

  /* Métodos de envío. price en la moneda de la tienda. */
  shippingMethods: [
    { id: 'estandar', name: 'Envío estándar', desc: '3 a 5 días hábiles a todo Colombia', price: 12000 },
    { id: 'express', name: 'Envío express', desc: '1 a 2 días hábiles (ciudades principales)', price: 22000 },
  ],

  /* Métodos de pago. La tienda NUNCA pide datos de tarjeta: los pide la pasarela. */
  paymentMethods: [
    { id: 'tarjeta', name: 'Tarjeta crédito o débito', desc: 'Visa, Mastercard, American Express. Te llevaremos a la pasarela segura para ingresar los datos.' },
    { id: 'pse', name: 'PSE', desc: 'Débito desde tu cuenta bancaria. Elegirás tu banco en la pasarela.' },
    { id: 'nequi', name: 'Nequi', desc: 'Recibirás una notificación en tu app Nequi para aprobar el pago.' },
    { id: 'contraentrega', name: 'Pago contra entrega', desc: 'Pagas en efectivo al recibir. Disponible en ciudades principales.' },
  ],

  /* Cupones de ejemplo. type: 'percent' | 'fixed' | 'shipping' */
  coupons: {
    BIENVENIDA10: { type: 'percent', value: 10, label: '10% de descuento de bienvenida' },
    SOLE20K: { type: 'fixed', value: 20000, minSubtotal: 120000, label: '$20.000 de descuento en compras desde $120.000' },
    ENVIOGRATIS: { type: 'shipping', label: 'Envío gratis' },
  },

  /* WhatsApp: número en formato internacional sin "+" ni espacios. */
  whatsapp: { number: '573000000000', message: 'Hola Sole Store, tengo una pregunta sobre un producto.' },

  /* Datos legales del comercio (Ley 1480 de 2011, art. 50, y Ley 1581 de 2012).
     OBLIGATORIO completarlos antes de publicar. Se muestran en el footer y en las políticas. */
  company: {
    legalName: '',          // Razón social o nombre de la persona natural. Ej.: 'Sole Store S.A.S.'
    nit: '',                // NIT con dígito de verificación. Ej.: '900.000.000-0'
    address: '',            // Dirección física de notificaciones
    city: 'Bogotá D.C., Colombia',
    phone: '',              // Teléfono de atención
    email: 'hola@solestore.co',
    privacyEmail: 'datos@solestore.co',   // Correo para ejercer derechos de habeas data
    hours: 'Lunes a viernes de 8:00 a. m. a 6:00 p. m.; sábados de 9:00 a. m. a 1:00 p. m.',
  },

  /* Versiones de los documentos legales. Súbelas cuando cambies el texto:
     así cada aceptación registrada indica qué versión aceptó la persona. */
  policyVersions: {
    terms: '1.0 (2026-11-22)',
    privacy: '1.0 (2026-11-22)',
    cookies: '1.0 (2026-11-22)',
    refunds: '1.0 (2026-11-22)',
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
  labiales: 'Labiales', rubores: 'Rubores', contorno: 'Contorno', correctores: 'Correctores', polvos: 'Polvos',
  fijadores: 'Fijadores', cejas: 'Cejas', delineadores: 'Delineadores', mascaras: 'Máscaras de pestañas',
  brochas: 'Brochas', accesorios: 'Esponjas y accesorios',
};
export const SKIN_TYPES = { seca: 'Seca', grasa: 'Grasa', mixta: 'Mixta', normal: 'Normal', sensible: 'Sensible' };
export const TONE_FAMILIES = {
  nude: { label: 'Nude', hex: '#D9A98F' }, rosa: { label: 'Rosa', hex: '#E58C9C' }, rojo: { label: 'Rojo', hex: '#A3212F' },
  coral: { label: 'Coral', hex: '#EE8170' }, malva: { label: 'Malva', hex: '#9B5A6F' }, marron: { label: 'Marrón', hex: '#7A4E31' },
  negro: { label: 'Negro', hex: '#1D1719' }, dorado: { label: 'Dorado', hex: '#D8B66A' },
};
