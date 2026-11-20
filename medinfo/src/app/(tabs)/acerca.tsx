import Constants from 'expo-constants';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useServices } from '@/state/services';
import { DISCLAIMER_POINTS } from '@/ui/components/DisclaimerGate';
import { Button, Card } from '@/ui/components/primitives';
import { font, spacing, useTheme } from '@/ui/theme';

const SOURCES = [
  {
    name: 'CIMA — Agencia Española de Medicamentos y Productos Sanitarios (AEMPS)',
    url: 'https://cima.aemps.es',
    text: 'Fuente principal. Fichas técnicas autorizadas de los medicamentos comercializados en España, en español.',
  },
  {
    name: 'openFDA — U.S. Food and Drug Administration',
    url: 'https://open.fda.gov',
    text: 'Fuente complementaria. Fichas de medicamentos autorizados en EE. UU., en inglés.',
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const { drugs } = useServices();

  const clear = async () => {
    const n = await drugs.clearCache();
    Alert.alert('Caché borrada', `Se eliminaron ${n} elementos guardados.`);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Card style={{ gap: spacing.md }}>
        <Text style={[styles.h2, { color: colors.text }]}>Aviso importante</Text>
        {DISCLAIMER_POINTS.map((p) => (
          <Text key={p} style={[styles.body, { color: colors.text }]}>
            • {p}
          </Text>
        ))}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={[styles.h2, { color: colors.text }]}>Fuentes de datos</Text>
        {SOURCES.map((s) => (
          <View key={s.url} style={{ gap: 2 }}>
            <Text style={[styles.link, { color: colors.primary }]} accessibilityRole="link" onPress={() => Linking.openURL(s.url)}>
              {s.name}
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{s.text}</Text>
          </View>
        ))}
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Los textos se muestran tal como los publica cada agencia, sin resumir ni traducir, para no alterar su
          contenido. Cada ficha indica su fuente y fecha de revisión.
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={[styles.h2, { color: colors.text }]}>Privacidad</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Tus búsquedas, medicamentos guardados y lista de interacciones se guardan solo en este dispositivo. La app no
          tiene cuentas ni envía datos personales; únicamente consulta a las fuentes oficiales el nombre que buscas.
        </Text>
        <Button label="Borrar datos en caché" icon="trash-outline" variant="secondary" onPress={clear} />
      </Card>

      <Text style={[styles.version, { color: colors.textMuted }]}>MedInfo {Constants.expoConfig?.version ?? ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  h2: { fontSize: font.bodyLarge, fontWeight: '700' },
  body: { fontSize: font.body, lineHeight: 22 },
  link: { fontSize: font.body, fontWeight: '600', textDecorationLine: 'underline' },
  version: { textAlign: 'center', fontSize: font.caption },
});
