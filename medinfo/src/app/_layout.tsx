import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServicesProvider } from '@/state/services';
import { UserDataProvider } from '@/state/userData';
import { DisclaimerGate } from '@/ui/components/DisclaimerGate';
import { useTheme } from '@/ui/theme';

export default function RootLayout() {
  const { colors, dark } = useTheme();
  return (
    <SafeAreaProvider>
      <ServicesProvider>
        <UserDataProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <DisclaimerGate>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primary,
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
                headerBackButtonDisplayMode: 'minimal',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="medicamento/[id]" options={{ title: 'Ficha del medicamento' }} />
            </Stack>
          </DisclaimerGate>
        </UserDataProvider>
      </ServicesProvider>
    </SafeAreaProvider>
  );
}
