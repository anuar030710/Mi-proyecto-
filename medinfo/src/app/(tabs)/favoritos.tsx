import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { useUserData } from '@/state/userData';
import { DrugListItem } from '@/ui/components/drug';
import { MessageView } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { favorites } = useUserData();
  if (favorites.length === 0) {
    return (
      <MessageView
        icon="bookmark-outline"
        title="Sin medicamentos guardados"
        message="Pulsa «Guardar» en la ficha de un medicamento para tenerlo a mano. Las fichas que abras quedan disponibles sin conexión."
      />
    );
  }
  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={favorites}
      keyExtractor={(d) => d.id}
      renderItem={({ item }) => (
        <DrugListItem drug={item} onPress={() => router.push({ pathname: '/medicamento/[id]', params: { id: item.id } })} />
      )}
    />
  );
}

const styles = StyleSheet.create({ list: { padding: spacing.lg, gap: spacing.sm } });
