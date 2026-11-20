import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, spacing, useTheme } from '../theme';
import { Button } from './primitives';

const KEY = 'medinfo:disclaimer-accepted:v1';

export const DISCLAIMER_POINTS = [
  'MedInfo muestra información de fuentes oficiales (AEMPS y FDA) con fines informativos. No sustituye la consulta con un médico o farmacéutico.',
  'No cambies, empieces ni dejes un tratamiento basándote solo en esta app.',
  'La comprobación de interacciones no es exhaustiva: que no aparezca una interacción no significa que no exista.',
  'En caso de urgencia o sospecha de intoxicación, llama al 112 o al Servicio de Información Toxicológica (+34 91 562 04 20).',
];

/** Muestra el aviso médico la primera vez que se abre la app y exige aceptarlo. */
export function DisclaimerGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'checking' | 'pending' | 'accepted'>('checking');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setState(v ? 'accepted' : 'pending'))
      .catch(() => setState('pending'));
  }, []);

  if (state === 'accepted') return <>{children}</>;
  if (state === 'checking') return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const accept = () => {
    AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
    setState('accepted');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          Antes de empezar
        </Text>
        {DISCLAIMER_POINTS.map((p) => (
          <View key={p} style={styles.point}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.text, { color: colors.text }]}>{p}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Entendido" onPress={accept} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: font.heading, fontWeight: '800', marginBottom: spacing.sm },
  point: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: font.bodyLarge, lineHeight: 24 },
  text: { flex: 1, fontSize: font.bodyLarge, lineHeight: 24 },
  footer: { padding: spacing.xl },
});
