/**
 * Métodos de envío de la tienda. Los valores se cambian desde el panel (Datos de la tienda → Envíos).
 *  - Envío nacional: rango de precio (depende de la ciudad); el valor exacto se confirma por WhatsApp.
 *  - Domicilio local (Caucasia): precio fijo, gratis (0) o "por confirmar" (vacío).
 */
import { CONFIG } from './config.js';
import { formatPrice } from './utils.js';

export function shippingMethods() {
  const s = CONFIG.shipping;
  return [
    { id: 'nacional', name: 'Envío nacional', desc: '3 a 5 días hábiles a todo Colombia por transportadora. El valor exacto depende de tu ciudad y te lo confirmamos por WhatsApp.', min: s.nationalMin, max: s.nationalMax },
    { id: 'domicilio', name: `Domicilio en ${s.localCity}`, desc: `Entrega a domicilio en ${s.localCity}, ${s.localDepartment}.`, price: s.localPrice, city: s.localCity, department: s.localDepartment },
  ];
}

/** Costo de un método: amount (número o null si se confirma por WhatsApp) y el texto a mostrar. */
export function shippingCost(m) {
  if (typeof m.price === 'number') return { amount: m.price, text: m.price === 0 ? 'Gratis' : formatPrice(m.price) };
  if (typeof m.min === 'number' && typeof m.max === 'number') {
    if (m.min === m.max) return { amount: m.min, text: formatPrice(m.min) };
    return { amount: null, text: `${formatPrice(m.min)} – ${formatPrice(m.max)}` };
  }
  return { amount: null, text: 'Por confirmar' };
}
