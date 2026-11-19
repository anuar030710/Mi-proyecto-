import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { config } from '@/config/env';
import type { DrugSummary } from '@/domain/types';
import { useDrugSearch } from '@/hooks/useDrugData';
import { useUserData } from '@/state/userData';
import { DrugListItem, errorMessage, SearchBar } from '@/ui/components/drug';
import { LoadingView, MessageView, Notice } from '@/ui/components/primitives';
import { font, radius, spacing, useTheme } from '@/ui/theme';

type Row = { type: 'header'; title: string; subtitle?: string } | { type: 'drug'; drug: DrugSummary };

const SUGGESTIONS = ['Paracetamol', 'Ibuprofeno', 'Omeprazol', 'Amoxicilina', 'Atorvastatina'];

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const search = useDrugSearch(query);
  const { recentSearches, addRecent, clearRecent } = useUserData();

  // Guarda en el historial las búsquedas que han dado resultados.
  useEffect(() => {
    if (search.status === 'success' && search.data.primary.length + search.data.international.length > 0) {
      addRecent(search.query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.status, search.query]);

  const rows = useMemo<Row[]>(() => {
    if (!search.data) return [];
    const { primary, international } = search.data;
    const out: Row[] = [];
    if (primary.length) {
      out.push({ type: 'header', title: `España · CIMA (AEMPS)`, subtitle: `${primary.length} presentaciones comercializadas` });
      out.push(...primary.map((drug) => ({ type: 'drug' as const, drug })));
    }
    if (international.length) {
      out.push({ type: 'header', title: 'Internacional · openFDA (EE. UU.)', subtitle: 'Fichas en inglés' });
      out.push(...international.map((drug) => ({ type: 'drug' as const, drug })));
    }
    return out;
  }, [search.data]);

  const open = (drug: DrugSummary) => router.push({ pathname: '/medicamento/[id]', params: { id: drug.id } });
  const trimmed = query.trim();

  let body: React.ReactNode;
  if (trimmed.length < config.search.minQueryLength) {
    body = (
      <View style={styles.idle}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {recentSearches.length ? 'Búsquedas recientes' : 'Prueba con'}
        </Text>
        <View style={styles.chips}>
          {(recentSearches.length ? recentSearches : SUGGESTIONS).map((s) => (
            <Pressable
              key={s}
              onPress={() => setQuery(s)}
              accessibilityRole="button"
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontSize: font.body }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        {recentSearches.length > 0 && (
          <Pressable onPress={clearRecent} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Borrar historial</Text>
          </Pressable>
        )}
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Puedes buscar por nombre comercial (Dalsy), principio activo (ibuprofeno) o nombre en inglés (acetaminophen).
          Toleramos pequeñas erratas.
        </Text>
      </View>
    );
  } else if (search.status === 'error') {
    const { title, message } = errorMessage(search.error);
    body = <MessageView icon="cloud-offline" title={title} message={message} action={{ label: 'Reintentar', onPress: search.retry }} />;
  } else if (!search.data) {
    body = <LoadingView label="Buscando en fuentes oficiales…" />;
  } else if (rows.length === 0) {
    body = (
      <MessageView
        icon="search"
        title="Sin resultados"
        message={`No encontramos "${search.query}". Revisa la ortografía o prueba con el principio activo.`}
      />
    );
  } else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.type === 'drug' ? r.drug.id : `h${i}`)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            {search.data.recognizedIngredient && (
              <Notice tone="info" icon="sparkles" text={`Mostrando resultados para el principio activo «${search.data.recognizedIngredient}».`} />
            )}
            {search.data.warnings.map((w) => (
              <Notice key={w} text={w} />
            ))}
          </View>
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View style={styles.header} accessibilityRole="header">
              <Text style={[styles.headerTitle, { color: colors.text }]}>{item.title}</Text>
              {item.subtitle && <Text style={{ color: colors.textMuted, fontSize: font.caption }}>{item.subtitle}</Text>}
            </View>
          ) : (
            <DrugListItem drug={item.drug} onPress={() => open(item.drug)} />
          )
        }
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} />
        {(search.status === 'loading' || search.pending) && trimmed.length >= config.search.minQueryLength && search.data && (
          <Text style={[styles.updating, { color: colors.textMuted }]} accessibilityLiveRegion="polite">
            Actualizando…
          </Text>
        )}
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: spacing.lg, paddingBottom: spacing.sm },
  updating: { fontSize: font.caption, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: { paddingTop: spacing.md, paddingBottom: spacing.xs },
  headerTitle: { fontSize: font.body, fontWeight: '700' },
  idle: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: font.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, minHeight: 40, justifyContent: 'center' },
  hint: { fontSize: font.body, lineHeight: 22, marginTop: spacing.md },
});
