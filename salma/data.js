/* Capa de datos: lee la tienda y los productos desde Firebase (si está configurado)
   o desde config.js. También crea pedidos y, para la administradora, los gestiona. */
const V = "10.14.1";
const base = `https://www.gstatic.com/firebasejs/${V}`;

let fb = null; // { app, db, auth, fs, au }

export function isLive() {
  return !!window.SALMA_FIREBASE;
}

export async function firebase() {
  if (fb || !isLive()) return fb;
  const [appMod, fs, au] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-auth.js`),
  ]);
  const app = appMod.initializeApp(window.SALMA_FIREBASE);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const emu = window.SALMA_FIREBASE_EMULATOR; // solo para pruebas locales
  if (emu) {
    fs.connectFirestoreEmulator(db, emu.host, emu.firestore);
    au.connectAuthEmulator(auth, `http://${emu.host}:${emu.auth}`, { disableWarnings: true });
  }
  fb = { app, db, auth, fs, au };
  return fb;
}

/* Tallas que aplican a un producto */
export function tallasDe(p, cfg) {
  return p.tallas && p.tallas.length ? p.tallas : cfg.tallas;
}
/* Unidades disponibles de una talla. null = sin control de inventario (modo config.js) */
export function stockDe(p, talla) {
  if (!p.stock) return null;
  return Math.max(0, Number(p.stock[talla] || 0));
}
export function agotado(p, cfg) {
  if (!p.stock) return p.disponible === false;
  return tallasDe(p, cfg).every((t) => stockDe(p, t) <= 0);
}

const sinProductos = (cfg) => { const c = Object.assign({}, cfg); delete c.productos; return c; };

/* Carga todo lo público: configuración de la tienda + productos visibles */
export async function cargarTienda({ incluirOcultos = false } = {}) {
  const local = window.SALMA_CONFIG;
  if (!isLive()) return { cfg: sinProductos(local), productos: local.productos.map((p, i) => ({ orden: i, ...p })), live: false };
  try {
    const { db, fs } = await firebase();
    const [cfgSnap, prodSnap] = await Promise.all([
      fs.getDoc(fs.doc(db, "tienda", "config")),
      fs.getDocs(fs.collection(db, "productos")),
    ]);
    const cfg = cfgSnap.exists() ? Object.assign(sinProductos(local), cfgSnap.data()) : sinProductos(local);
    let productos = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!productos.length && !incluirOcultos) productos = local.productos.map((p, i) => ({ orden: i, ...p })); // aún sin importar
    if (!incluirOcultos) productos = productos.filter((p) => p.visible !== false);
    productos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return { cfg, productos, live: true, vacio: prodSnap.empty };
  } catch (e) {
    console.error("No se pudo leer Firebase, uso config.js", e);
    return { cfg: sinProductos(local), productos: local.productos.map((p, i) => ({ orden: i, ...p })), live: false, error: e };
  }
}

/* Guarda un pedido pendiente (con su registro de consentimiento). Devuelve el id o null. */
export async function crearPedido(pedido) {
  if (!isLive()) return null;
  try {
    const { db, fs } = await firebase();
    const ref = await fs.addDoc(fs.collection(db, "pedidos"), {
      ...pedido,
      estado: "pendiente",
      creado: fs.serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.error("No se pudo guardar el pedido en Firebase", e);
    return null;
  }
}
