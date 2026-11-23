/**
 * Pedidos por WhatsApp: la página NO cobra. Arma un mensaje con el pedido completo
 * y abre WhatsApp para que la clienta lo envíe; el pago se acuerda en esa conversación.
 */
import { CONFIG } from './config.js';
import { formatPrice } from './utils.js';

export function orderMessage(o) {
  const lines = [
    `Hola ${CONFIG.storeName}, quiero hacer este pedido:`,
    '',
    `Pedido: ${o.id}`,
    ...o.items.map((i) => `- ${i.qty} x ${i.name}${i.tone ? ` (${i.tone})` : ''}: ${formatPrice(i.total)}`),
    '',
    `Subtotal: ${formatPrice(o.totals.subtotal)}`,
    ...(o.totals.discount ? [`Descuento${o.totals.coupon ? ` (${o.totals.coupon})` : ''}: -${formatPrice(o.totals.discount)}`] : []),
    `Envío (${o.shipping.method}): ${o.totals.shipping === 0 ? 'Gratis' : o.totals.shipping == null ? (/–/.test(o.totals.shippingText || '') ? `${o.totals.shippingText} (te confirmamos el valor)` : 'Por confirmar') : formatPrice(o.totals.shipping)}`,
    `Total: ${formatPrice(o.totals.total)}${o.totals.shipping == null ? ' + envío' : ''}`,
    '',
    `Nombre: ${o.contact.name}`,
    `Celular: ${o.contact.phone}`,
    `Entrega: ${o.shipping.address}${o.shipping.address2 ? `, ${o.shipping.address2}` : ''}, ${o.shipping.city}, ${o.shipping.department}`,
    `Factura: ${typeof o.invoice === 'string' ? o.invoice : `${o.invoice.docType} ${o.invoice.docNumber}`}`,
    '',
    `¿Me confirman disponibilidad y los datos para pagar por ${CONFIG.paymentOptions.join(' o ')}?`,
  ];
  return lines.join('\n');
}

export const orderWhatsappUrl = (o) => `https://wa.me/${CONFIG.whatsapp.number}?text=${encodeURIComponent(orderMessage(o))}`;
