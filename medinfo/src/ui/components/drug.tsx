import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DataError, type DrugSection, type DrugSummary } from '@/domain/types';
import { displayIngredientName } from '@/services/search/ingredientResolver';
import { font, radius, spacing, useTheme } from '../theme';
import { Card, Tag } from './primitives';

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Nombre, marca o principio activo',
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, { backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.border }]}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.searchInput, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel="Buscar medicamento"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

export function ingredientsLabel(drug: Pick<DrugSummary, 'activeIngredients'>): string {
  const names = drug.activeIngredients.map(displayIngredientName).filter(Boolean);
  return names.map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(' + ');
}

export const DrugListItem = memo(function DrugListItem({
  drug,
  onPress,
  trailing,
}: {
  drug: DrugSummary;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const ingredients = ingredientsLabel(drug);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${drug.name}. ${ingredients}. ${drug.presentation ?? ''}`}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
          {drug.name}
        </Text>
        {ingredients ? (
          <Text style={[styles.itemSubtitle, { color: colors.primary }]} numberOfLines={1}>
            {ingredients}
          </Text>
        ) : null}
        {drug.presentation ? (
          <Text style={[styles.itemMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {drug.presentation}
          </Text>
        ) : null}
        <View style={styles.tags}>
          {drug.source === 'openfda' && <Tag label="EE. UU. · inglés" />}
          {drug.requiresPrescription === true && <Tag label="Con receta" tone="warning" />}
          {drug.requiresPrescription === false && <Tag label="Sin receta" tone="primary" />}
        </View>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
    </Pressable>
  );
});

const COLLAPSED_PARAGRAPHS = 4;

/** Sección de la ficha técnica, plegable para que los textos largos no saturen la pantalla. */
export function SectionCard({ section, initiallyOpen = false }: { section: DrugSection; initiallyOpen?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? section.paragraphs : section.paragraphs.slice(0, COLLAPSED_PARAGRAPHS);
  const hidden = section.paragraphs.length - visible.length;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={section.title}
        style={styles.sectionHeader}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
        {section.language === 'en' && <Tag label="EN" />}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open && (
        <View style={styles.sectionBody}>
          {section.language === 'en' && (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Texto original de la ficha estadounidense (inglés), sin traducir para no alterar su contenido.
            </Text>
          )}
          {visible.map((p, i) => {
            const isHeading = p.startsWith('▸ ');
            return (
              <Text
                key={i}
                selectable
                style={[
                  isHeading ? styles.subheading : styles.paragraph,
                  { color: isHeading ? colors.primary : colors.text },
                ]}
              >
                {isHeading ? p.slice(2) : p}
              </Text>
            );
          })}
          {section.paragraphs.length > COLLAPSED_PARAGRAPHS && (
            <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.more, { color: colors.primary }]}>
                {expanded ? 'Mostrar menos' : `Mostrar todo (${hidden} párrafos más)`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

export function errorMessage(error: Error): { title: string; message: string } {
  if (error instanceof DataError) {
    switch (error.kind) {
      case 'network':
        return { title: 'Sin conexión', message: 'Comprueba tu conexión a internet e inténtalo de nuevo.' };
      case 'timeout':
        return { title: 'La fuente tarda en responder', message: 'El servidor oficial está lento. Inténtalo de nuevo.' };
      case 'rate-limited':
        return { title: 'Demasiadas consultas', message: 'Espera unos segundos e inténtalo de nuevo.' };
      case 'not-found':
        return { title: 'No encontrado', message: error.message };
      default:
        return { title: 'Algo salió mal', message: error.message };
    }
  }
  return { title: 'Algo salió mal', message: 'Se produjo un error inesperado.' };
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  // fontSize ≥ 16 evita el zoom automático del navegador al enfocar en la versión web.
  searchInput: {
    flex: 1,
    fontSize: font.bodyLarge,
    paddingVertical: spacing.sm,
    // En web el anillo de foco lo dibuja el contenedor (borde de color primario).
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { fontSize: font.body, fontWeight: '600' },
  itemSubtitle: { fontSize: font.caption + 1, fontWeight: '600' },
  itemMeta: { fontSize: font.caption },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, minHeight: 52 },
  sectionTitle: { flex: 1, fontSize: font.bodyLarge, fontWeight: '700' },
  sectionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  paragraph: { fontSize: font.body, lineHeight: 24 },
  subheading: { fontSize: font.body, fontWeight: '700', marginTop: spacing.sm },
  meta: { fontSize: font.caption, fontStyle: 'italic' },
  more: { fontSize: font.body, fontWeight: '600', paddingVertical: spacing.xs },
});
