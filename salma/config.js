/* =====================================================================
   INSPIRATO SALMA — ARCHIVO DE CONFIGURACIÓN
   ---------------------------------------------------------------------
   Aquí se edita TODO lo de la tienda: datos de la marca, WhatsApp,
   precios, colores, tallas, fotos y datos legales.

   Dos formas de editarlo:
   1) Abre  editor.html  en el navegador, cambia lo que quieras y pulsa
      "Descargar config.js". Reemplaza este archivo por el descargado.
   2) Edita este archivo a mano (respeta comillas y comas).

   Los precios van en pesos colombianos, SIN puntos: 45000 = $45.000.
   Por ley (Ley 1480 de 2011, art. 26) el precio debe incluir impuestos.
   ===================================================================== */

window.SALMA_CONFIG = {
  marca: {
    nombre: "Inspirato Salma",
    lema: "Florece con piezas únicas",
    descripcion:
      "Prendas auténticas, innovadoras y hechas para mujeres que no siguen tendencias… las crean.",
    envio:
      "Llegará hasta tu hogar con total seguridad y con ganas de que deslumbres con tu pieza.",
    instagram: "", // ej: "https://instagram.com/inspiratosalma" (vacío = no se muestra)
  },

  // Número de WhatsApp con indicativo del país, solo dígitos (57 = Colombia)
  whatsapp: "573145026686",
  whatsappVisible: "314 502 6686",

  pagos: ["Nequi", "Bancolombia", "Efectivo"],
  notaPagos: "Pago inmediato · Facilidad de pago",

  /* ---------- DATOS LEGALES (OBLIGATORIOS — Ley 1480 art. 50 y Ley 1581) ----------
     Complétalos antes de publicar. Mientras digan [COMPLETAR] la página
     mostrará un aviso amarillo para que no se te olviden. */
  legal: {
    responsable: "[COMPLETAR: nombre completo o razón social]",
    documento: "[COMPLETAR: C.C. o NIT]",
    ciudad: "[COMPLETAR: ciudad], Colombia",
    direccion: "[COMPLETAR: dirección de notificaciones]",
    correo: "[COMPLETAR: correo para PQRS y datos personales]",
    telefono: "314 502 6686",
    // Fecha en que entran a regir las políticas (cámbiala si las modificas)
    vigencia: "2026-11-20",
    // Si cambias el texto de términos o privacidad, sube la versión (1.0 → 1.1)
    versionTerminos: "1.0",
    versionPrivacidad: "1.0",
    garantiaMeses: 3, // garantía anunciada por defectos de fabricación
    diasEntrega: "2 a 5 días hábiles", // tiempo estimado de entrega
    costoEnvio: "Se informa por WhatsApp según tu ciudad antes de pagar",
  },

  /* ---------- REGISTRO DE CONSENTIMIENTO ----------
     Cada aceptación queda: (1) escrita dentro del mensaje de WhatsApp que
     te llega, (2) guardada en el navegador de la clienta y (3) si pegas
     aquí la URL de tu Google Apps Script (ver LEEME.md), en tu Google Sheet. */
  urlRegistroConsentimiento: "",

  tallas: ["S", "M", "L", "XL"],

  /* ---------- PRODUCTOS ----------
     id:        identificador único sin espacios
     nombre:    nombre visible
     categoria: "Conjuntos" | "Batolas" | "Enterizos" | "Sets"
     precio:    precio actual (número)
     precioAntes: precio tachado opcional (0 = no mostrar)
     piezas:    qué incluye
     colores:   lista de { nombre, hex }
     tallas:    vacío [] = usa las tallas generales de arriba
     imagen:    ruta de la foto
     disponible: true/false (false = "Agotado")
     nuevo:     true/false (muestra etiqueta "Nuevo")                      */
  productos: [
    {
      id: "set-corazon-4-piezas",
      nombre: "Set Corazón Radiante",
      categoria: "Sets",
      precio: 69000,
      precioAntes: 0,
      piezas: "4 piezas: crop top, short, top triangular y panty de amarrar",
      colores: [{ nombre: "Rojo con corazones rosa", hex: "#e2263a" }],
      tallas: [],
      imagen: "img/set-corazon-4-piezas.webp",
      disponible: true,
      nuevo: true,
    },
    {
      id: "conjunto-gato-aguacate",
      nombre: "Conjunto Michi Aguacate",
      categoria: "Conjuntos",
      precio: 45000,
      precioAntes: 0,
      piezas: "Esqueleto estampado + short",
      colores: [{ nombre: "Verde lima", hex: "#7fd83a" }],
      tallas: [],
      imagen: "img/conjunto-gato-aguacate.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-vaquita",
      nombre: "Conjunto Vaquita Rosa",
      categoria: "Conjuntos",
      precio: 45000,
      precioAntes: 0,
      piezas: "Esqueleto estampado + short",
      colores: [{ nombre: "Rosado", hex: "#f39bc0" }],
      tallas: [],
      imagen: "img/conjunto-vaquita.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "enterizo-gato-aguacate",
      nombre: "Enterizo Michi Aguacate",
      categoria: "Enterizos",
      precio: 55000,
      precioAntes: 0,
      piezas: "Enterizo manga corta con abertura y lazo en la espalda",
      colores: [{ nombre: "Verde lima", hex: "#7fd83a" }],
      tallas: [],
      imagen: "img/enterizo-gato-aguacate.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "batola-ositos-rayas",
      nombre: "Batola Ositos a Rayas",
      categoria: "Batolas",
      precio: 50000,
      precioAntes: 0,
      piezas: "Batola con encaje + panty a juego",
      colores: [{ nombre: "Azul cielo y blanco", hex: "#5cc6ea" }],
      tallas: [],
      imagen: "img/batola-ositos-rayas.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "batola-regalitos",
      nombre: "Batola Regalitos",
      categoria: "Batolas",
      precio: 50000,
      precioAntes: 0,
      piezas: "Batola con encaje + panty a juego",
      colores: [{ nombre: "Rosa con encaje rojo", hex: "#f6b6d3" }],
      tallas: [],
      imagen: "img/batola-regalitos.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-corazon-rayas",
      nombre: "Conjunto Corazón Dulce",
      categoria: "Conjuntos",
      precio: 55000,
      precioAntes: 0,
      piezas: "Camiseta + pantalón largo",
      colores: [{ nombre: "Blanco y durazno", hex: "#f7c9b6" }],
      tallas: [],
      imagen: "img/conjunto-corazon-rayas.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-gatitos-meow",
      nombre: "Conjunto Gatitos Meow",
      categoria: "Conjuntos",
      precio: 55000,
      precioAntes: 0,
      piezas: "Camiseta + pantalón largo",
      colores: [{ nombre: "Blanco y rosado", hex: "#f2708f" }],
      tallas: [],
      imagen: "img/conjunto-gatitos-meow.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-corazones-cuadros",
      nombre: "Conjunto Corazones a Cuadros",
      categoria: "Conjuntos",
      precio: 48000,
      precioAntes: 0,
      piezas: "Camiseta + short",
      colores: [{ nombre: "Blanco y rosa cuadros", hex: "#f4a6b4" }],
      tallas: [],
      imagen: "img/conjunto-corazones-cuadros.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-aguacate-monito",
      nombre: "Conjunto Aguacate Moñito",
      categoria: "Conjuntos",
      precio: 48000,
      precioAntes: 0,
      piezas: "Camiseta + short",
      colores: [{ nombre: "Blanco y amarillo", hex: "#f3ec7a" }],
      tallas: [],
      imagen: "img/conjunto-aguacate-monito.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-ovejitas",
      nombre: "Conjunto Ovejitas Dormilonas",
      categoria: "Conjuntos",
      precio: 52000,
      precioAntes: 0,
      piezas: "Crop top + pantalón largo",
      colores: [{ nombre: "Rojo", hex: "#c8202c" }],
      tallas: [],
      imagen: "img/conjunto-ovejitas.webp",
      disponible: true,
      nuevo: false,
    },
    {
      id: "conjunto-aguacates-pantalon",
      nombre: "Conjunto Aguacates",
      categoria: "Conjuntos",
      precio: 52000,
      precioAntes: 0,
      piezas: "Crop top de amarrar + pantalón largo",
      colores: [{ nombre: "Amarillo crema", hex: "#f5f3b8" }],
      tallas: [],
      imagen: "img/conjunto-aguacates-pantalon.webp",
      disponible: true,
      nuevo: false,
    },
  ],
};
