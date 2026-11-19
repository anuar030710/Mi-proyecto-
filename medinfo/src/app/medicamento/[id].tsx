import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Drug } from '@/domain/types';
import { useDrug } from '@/hooks/useDrugData';
import { classLabelsFor } from '@/services/interactions/interactionChecker';
import { MAX_INTERACTION_LIST, useUserData } from '@/state/userData';
import { errorMessage, ingredientsLabel, SectionCard } from '@/ui/components/drug';
import { Button, Card, LoadingView, MessageView, Notice, Tag } from '@/ui/components/primitives';
import { font, spacing, useTheme } from '@/ui/theme';

/** Orden de las secciones: lo más consultado y lo más crítico primero. */
const SECTION_ORDER = ['boxedWarning', 'indications', 'dosage', 'contraindications', 'sideEffects', 'interactions', 'warnings', 'pregnancy', 'overdose'];

export default function DrugScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDrug(id);
  const { colors } = useTheme();

  if (state.status === 'error') {
    const { title, message } = errorMessage(state.error);
    return <MessageView icon="alert-circle" title={title} message={message} action={{ label: 'Reintentar', onPress: state.retry }} />;
  }
  if (!state.data) return <LoadingView label="Cargando ficha técnica…" />;

  const { drug, stale } = state.data;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: drug.source === 'cima' ? 'Ficha técnica' : 'Ficha (EE. UU.)' }} />
      <DrugHeader drug={drug} />
      {stale && (
        <Notice
          icon="cloud-offline"
          text={`Sin conexión: se muestra la copia guardada el ${new Date(drug.fetchedAt).toLocaleDateString('es-ES')}. Puede no estar actualizada.`}
        />
      )}
      {drug.sections.length === 0 ? (
        <Notice text="La fuente no ofrece la ficha técnica segmentada para este medicamento. Consulta el documento original en el enlace inferior." />
      ) : (
        [...drug.sections]
          .sort((a, b) => SECTION_ORDER.indexOf(a.key) - SECTION_ORDER.indexOf(b.key))
          .map((s) => <SectionCard key={s.key} section={s} initiallyOpen={s.key === 'boxedWarning' || s.key === 'dosage'} />)
      )}
      <References drug={drug} />
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Información procedente de la ficha técnica oficial, mostrada sin modificaciones. No sustituye el consejo de un
        profesional sanitario: la dosis adecuada depende de cada paciente.
      </Text>
    </ScrollView>
  );
}

function DrugHeader({ drug }: { drug: Drug }) {
  const { colors } = useTheme();
  const user = useUserData();
  const fav = user.isFavorite(drug.id);
  const inList = user.isInInteractions(drug.id);
  const full = user.interactionList.length >= MAX_INTERACTION_LIST;
  const classes = classLabelsFor(drug);

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header" selectable>
        {drug.name}
      </Text>
      <Text style={[styles.ingredients, { color: colors.primary }]}>{ingredientsLabel(drug)}</Text>
      {drug.presentation && <Text style={{ color: colors.textMuted, fontSize: font.body }}>{drug.presentation}</Text>}
      {drug.manufacturer && <Text style={{ color: colors.textMuted, fontSize: font.caption }}>{drug.manufacturer}</Text>}
      <View style={styles.tags}>
        {drug.requiresPrescription === true && <Tag label="Con receta" tone="warning" />}
        {drug.requiresPrescription === false && <Tag label="Sin receta" tone="primary" />}
        {classes.map((c) => (
          <Tag key={c} label={c} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          label={fav ? 'Guardado' : 'Guardar'}
          icon={fav ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={() => user.toggleFavorite(drug)}
        />
        <Button
          label={inList ? 'Ver interacciones' : 'Comprobar interacciones'}
          icon="git-compare"
          variant={inList ? 'secondary' : 'primary'}
          disabled={!inList && full}
          accessibilityHint="Añade este medicamento a la lista para comprobar interacciones"
          onPress={() => {
            if (!inList) user.addToInteractions(drug);
            router.navigate('/interacciones');
          }}
        />
      </View>
    </Card>
  );
}

function References({ drug }: { drug: Drug }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={[styles.refTitle, { color: colors.text }]}>Fuentes</Text>
      {drug.references.map((r) => (
        <View key={r.name} style={{ gap: 2 }}>
          {r.url ? (
            <Text
              style={[styles.link, { color: colors.primary }]}
              accessibilityRole="link"
              onPress={() => r.url && Linking.openURL(r.url)}
            >
              {r.name}
            </Text>
          ) : (
            <Text style={{ color: colors.text }}>{r.name}</Text>
          )}
          {r.revisedAt && (
            <Text style={{ color: colors.textMuted, fontSize: font.caption }}>
              Revisión del documento: {new Date(r.revisedAt).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
            </Text>
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: font.title + 2, fontWeight: '800' },
  ingredients: { fontSize: font.bodyLarge, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  refTitle: { fontSize: font.bodyLarge, fontWeight: '700' },
  link: { fontSize: font.body, textDecorationLine: 'underline' },
  footer: { fontSize: font.caption, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.md },
});
