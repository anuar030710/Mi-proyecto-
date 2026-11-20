import { useColorScheme } from 'react-native';
import type { InteractionSeverity } from '@/domain/types';

/**
 * Sistema de diseño: colores semánticos (no "azul", sino "primario", "peligro"…) con variantes
 * clara y oscura, y escalas de espaciado y tipografía. Los componentes solo usan estos tokens.
 * Contrastes de texto ≥ 4.5:1 sobre su fondo (WCAG AA).
 */
const light = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F4',
  border: '#D9DEE4',
  text: '#16202A',
  textMuted: '#4F5D6B',
  primary: '#0B6E6E',
  primaryText: '#FFFFFF',
  primarySoft: '#DDF0EF',
  warningSoft: '#FFF4D6',
  warningText: '#6B4A00',
  dangerSoft: '#FDE4E4',
  dangerText: '#8A1C1C',
  severity: {
    contraindicada: { bg: '#8A1C1C', fg: '#FFFFFF' },
    grave: { bg: '#C2410C', fg: '#FFFFFF' },
    moderada: { bg: '#FBD38D', fg: '#4A2A00' },
    leve: { bg: '#D1E7DD', fg: '#0F3D2A' },
    desconocida: { bg: '#E2E8F0', fg: '#1E293B' },
  } satisfies Record<InteractionSeverity, { bg: string; fg: string }>,
};

const dark: typeof light = {
  background: '#0E1419',
  surface: '#172028',
  surfaceMuted: '#1F2A33',
  border: '#2C3A46',
  text: '#E8EEF3',
  textMuted: '#A3B1BE',
  primary: '#5CC8C2',
  primaryText: '#062424',
  primarySoft: '#123534',
  warningSoft: '#3A2E0E',
  warningText: '#F7D88A',
  dangerSoft: '#3D1515',
  dangerText: '#F8B4B4',
  severity: {
    contraindicada: { bg: '#F87171', fg: '#2A0505' },
    grave: { bg: '#FB923C', fg: '#2A1003' },
    moderada: { bg: '#FCD34D', fg: '#2A1D00' },
    leve: { bg: '#86EFAC', fg: '#052E16' },
    desconocida: { bg: '#CBD5E1', fg: '#0F172A' },
  },
};

export type Colors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = {
  caption: 13,
  body: 16,
  bodyLarge: 17,
  title: 20,
  heading: 26,
} as const;

export function useTheme() {
  const scheme = useColorScheme();
  return { colors: scheme === 'dark' ? dark : light, dark: scheme === 'dark' };
}

export const SEVERITY_LABEL: Record<InteractionSeverity, string> = {
  contraindicada: 'Contraindicada',
  grave: 'Grave',
  moderada: 'Moderada',
  leve: 'Leve',
  desconocida: 'Revisar',
};
