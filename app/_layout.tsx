import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* The app's surfaces are styled light; pin the navigation theme so a
            device in dark mode doesn't get inverted nav backgrounds/text. */}
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#0019A8' },
              headerTintColor: '#FFF',
              headerTitleStyle: { fontWeight: '800' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="plan"
              options={{ title: 'Plan a journey', presentation: 'modal' }}
            />
            <Stack.Screen
              name="status"
              options={{ title: 'Line status', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trains"
              options={{ title: 'Live trains', presentation: 'modal' }}
            />
            <Stack.Screen
              name="journey/[id]"
              options={{ title: 'Journey', presentation: 'card' }}
            />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
