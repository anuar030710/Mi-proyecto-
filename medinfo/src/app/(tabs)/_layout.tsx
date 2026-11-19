import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useUserData } from '@/state/userData';
import type { IconName } from '@/ui/components/primitives';
import { useTheme } from '@/ui/theme';

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { interactionList } = useUserData();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Buscar', headerTitle: 'MedInfo', tabBarIcon: icon('search') }} />
      <Tabs.Screen
        name="interacciones"
        options={{
          title: 'Interacciones',
          tabBarIcon: icon('git-compare'),
          tabBarBadge: interactionList.length > 0 ? interactionList.length : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryText },
        }}
      />
      <Tabs.Screen name="favoritos" options={{ title: 'Guardados', tabBarIcon: icon('bookmark') }} />
      <Tabs.Screen name="acerca" options={{ title: 'Información', tabBarIcon: icon('information-circle') }} />
    </Tabs>
  );
}
