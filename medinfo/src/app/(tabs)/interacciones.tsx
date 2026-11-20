import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Drug, DrugSummary, Interaction } from '@/domain/types';
import { useDrugSearch, useDrugs } from '@/hooks/useDrugData';
import { checkInteractions } from '@/services/interactions/interactionChecker';
import { MAX_INTERACTION_LIST, useUserData } from '@/state/userData';
import { errorMessage, ingredientsLabel, SearchBar } from '@/ui/components/drug';
import { Card, MessageView, Notice, SeverityBadge } from '@/ui/components/primitives';
import { font, radius, spacing, useTheme } from '@/ui/theme';

export default function InteractionsScreen() {
  const { colors } = useTheme();
  const { interactionList, removeFromInteractions, clearInteractions } = useUserData();
  const ids = useMemo(() => interactionList.map((d) => d.id), [interactionList]);
  const loaded = useDrugs(ids);

  const drugs: Drug[] = loaded.data?.loaded.map((r) => r.drug) ?? [];
  const interactions = useMemo(() => checkInteractions(drugs), [loaded.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const names = new Map(interactionList.map((d) => [d.id, d.name]));
  const ready = ids.length >= 2 && loaded.status === 'success';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.intro, { color: colors.textMuted }]}>
        Añade los medicamentos que tomas para comprobar si interaccionan entre sí. Máximo {MAX_INTERACTION_LIST}.
      </Text>

      <AddDrug disabled={interactionList.length >= MAX_INTERACTION_LIST} />

      {interactionList.length > 0 && (
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.h2, { color: colors.text }]}>Mi lista ({interactionList.length})</Text>
            <Pressable onPress={clearInteractions} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Vaciar</Text>
            </Pressable>
          </View>
          {interactionList.map((d) => (
            <View key={d.id} style={[styles.listRow, { borderColor: colors.border }]}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: d.id } })} accessibilityRole="link">
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: font.body }} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: font.caption }} numberOfLines={1}>
                  {ingredientsLabel(d)}
                </Text>
              </Pressable>
              {loaded.data?.failed.includes(d.id) && <Ionicons name="alert-circle" size={18} color={colors.dangerText} />}
              <Pressable
                onPress={() => removeFromInteractions(d.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${d.name}`}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {ids.length < 2 ? (
        <MessageView
          icon="git-compare-outline"
          title={ids.length === 0 ? 'Tu lista está vacía' : 'Añade otro medicamento'}
          message="Necesitas al menos dos medicamentos para comprobar interacciones."
        />
      ) : loaded.status === 'error' ? (
        <MessageView icon="cloud-offline" {...errorMessage(loaded.error)} action={{ label: 'Reintentar', onPress: loaded.retry }} />
      ) : !ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted }}>Analizando fichas técnicas…</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {loaded.data!.failed.length > 0 && (
            <Notice
              tone="danger"
              text={`No se pudo cargar la ficha de ${loaded.data!.failed.length} medicamento(s); el análisis está incompleto.`}
            />
          )}
          <Text style={[styles.h2, { color: colors.text }]} accessibilityRole="header">
            {interactions.length === 0 ? 'No se encontraron interacciones' : `${interactions.length} posibles interacciones`}
          </Text>
          {interactions.map((it, i) => (
            <InteractionCard key={`${it.drugIds.join('-')}-${it.evidence}-${i}`} interaction={it} names={names} />
          ))}
          <Notice
            tone="info"
            text="Este análisis combina una tabla revisada de interacciones relevantes con la búsqueda en la sección de interacciones de cada ficha técnica. No es exhaustivo: consulta siempre con tu médico o farmacéutico."
          />
        </View>
      )}
    </ScrollView>
  );
}

function InteractionCard({ interaction, names }: { interaction: Interaction; names: Map<string, string> }) {
  const { colors } = useTheme();
  const [showText, setShowText] = useState(false);
  const evidence = {
    curada: 'Interacción documentada',
    'ficha-tecnica': 'Mencionada en la ficha técnica',
    duplicidad: 'Duplicidad de principio activo',
  }[interaction.evidence];

  return (
    <Card style={{ gap: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.severity[interaction.severity].bg }}>
      <View style={styles.rowBetween}>
        <SeverityBadge severity={interaction.severity} />
        <Text style={{ color: colors.textMuted, fontSize: font.caption }}>{evidence}</Text>
      </View>
      <Text style={[styles.h3, { color: colors.text }]}>{interaction.title}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{interaction.summary}</Text>
      {interaction.management && (
        <Text style={[styles.body, { color: colors.text }]}>
          <Text style={{ fontWeight: '700' }}>Qué hacer: </Text>
          {interaction.management}
        </Text>
      )}
      {interaction.excerpts.length > 0 && (
        <>
          <Pressable onPress={() => setShowText((s) => !s)} accessibilityRole="button" accessibilityState={{ expanded: showText }} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {showText ? 'Ocultar texto de la ficha técnica' : `Ver texto de la ficha técnica (${interaction.excerpts.length})`}
            </Text>
          </Pressable>
          {showText &&
            interaction.excerpts.map((e, i) => (
              <View key={i} style={[styles.quote, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={{ color: colors.textMuted, fontSize: font.caption, fontWeight: '700' }}>{names.get(e.drugId)}</Text>
                <Text style={[styles.body, { color: colors.text }]} selectable>
                  {e.text}
                </Text>
              </View>
            ))}
        </>
      )}
    </Card>
  );
}

function AddDrug({ disabled }: { disabled: boolean }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const search = useDrugSearch(query);
  const { addToInteractions, isInInteractions } = useUserData();

  const options: DrugSummary[] = search.data ? [...search.data.primary, ...search.data.international].slice(0, 6) : [];
  const add = (d: DrugSummary) => {
    addToInteractions(d);
    setQuery('');
  };

  if (disabled) return <Notice text={`Has alcanzado el máximo de ${MAX_INTERACTION_LIST} medicamentos.`} />;
  return (
    <View style={{ gap: spacing.sm }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Añadir medicamento…" />
      {query.trim().length >= 3 && (
        <Card style={{ padding: spacing.xs }}>
          {search.status === 'error' ? (
            <Text style={{ color: colors.dangerText, padding: spacing.md }}>{errorMessage(search.error).message}</Text>
          ) : !search.data ? (
            <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
          ) : options.length === 0 ? (
            <Text style={{ color: colors.textMuted, padding: spacing.md }}>Sin resultados</Text>
          ) : (
            options.map((d) => {
              const added = isInInteractions(d.id);
              return (
                <Pressable
                  key={d.id}
                  disabled={added}
                  onPress={() => add(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir ${d.name}`}
                  style={({ pressed }) => [styles.option, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: font.body }} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.caption }} numberOfLines={1}>
                      {ingredientsLabel(d)} {d.source === 'openfda' ? '· EE. UU.' : ''}
                    </Text>
                  </View>
                  <Ionicons name={added ? 'checkmark' : 'add-circle'} size={22} color={colors.primary} />
                </Pressable>
              );
            })
          )}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { fontSize: font.body, lineHeight: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  h2: { fontSize: font.bodyLarge, fontWeight: '700' },
  h3: { fontSize: font.bodyLarge, fontWeight: '700' },
  body: { fontSize: font.body, lineHeight: 22 },
  quote: { padding: spacing.md, borderRadius: radius.sm, gap: spacing.xs },
  loading: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, minHeight: 48 },
});
