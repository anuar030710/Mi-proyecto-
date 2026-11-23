/**
 * Cuentas y pedidos — VERSIÓN DE DEMOSTRACIÓN.
 *
 * Las cuentas se guardan solo en el navegador de la persona (localStorage), con la contraseña
 * cifrada con PBKDF2. Sirve para probar la experiencia completa sin servidor, pero en producción
 * DEBES reemplazar este módulo por un backend real (ver README: "Base de datos").
 */
import { storage } from './utils.js';

const USERS_KEY = 'sole_users';
const SESSION_KEY = 'sole_session';
const ORDERS_KEY = 'sole_orders';

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash: toHex(bits), salt: toHex(salt) };
}

const users = () => storage.get(USERS_KEY, {});

export async function register({ name, email, password, marketing }) {
  const all = users();
  const key = email.toLowerCase();
  if (all[key]) return { ok: false, error: 'Ya existe una cuenta con este correo. Inicia sesión.' };
  const { hash, salt } = await hashPassword(password);
  // Minimización: solo nombre, correo y contraseña. Nada de fecha de nacimiento, género ni documento.
  all[key] = { name, email: key, hash, salt, marketing: !!marketing, createdAt: new Date().toISOString() };
  storage.set(USERS_KEY, all);
  storage.set(SESSION_KEY, { email: key });
  return { ok: true };
}

export async function login(email, password) {
  const u = users()[email.toLowerCase()];
  if (!u) return { ok: false, error: 'Correo o contraseña incorrectos.' };
  const { hash } = await hashPassword(password, u.salt);
  if (hash !== u.hash) return { ok: false, error: 'Correo o contraseña incorrectos.' };
  storage.set(SESSION_KEY, { email: u.email });
  return { ok: true };
}

export const logout = () => storage.remove(SESSION_KEY);

export function currentUser() {
  const s = storage.get(SESSION_KEY, null);
  if (!s) return null;
  const u = users()[s.email];
  if (!u) return null;
  const { hash, salt, ...safe } = u;
  return safe;
}

export function updateUser(email, changes) {
  const all = users();
  if (!all[email]) return;
  all[email] = { ...all[email], ...changes };
  storage.set(USERS_KEY, all);
}

/** Derecho de supresión (habeas data): borra cuenta, pedidos y sesión de este navegador. */
export function deleteAccount(email) {
  const all = users(); delete all[email]; storage.set(USERS_KEY, all);
  storage.set(ORDERS_KEY, getOrders().filter((o) => o.contact.email !== email));
  logout();
}

/* ---------------- Pedidos ---------------- */
export const getOrders = () => storage.get(ORDERS_KEY, []);
export const saveOrder = (order) => { const all = getOrders(); all.unshift(order); storage.set(ORDERS_KEY, all.slice(0, 50)); };
export const findOrder = (id) => getOrders().find((o) => o.id === id);
export const ordersFor = (email) => getOrders().filter((o) => (o.contact.email || '').toLowerCase() === email.toLowerCase());
