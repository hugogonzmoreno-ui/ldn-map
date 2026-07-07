import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const clientRef = useRef<QueryClient>();
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, refetchOnWindowFocus: false },
      },
    });
  }

  return (
    <QueryClientProvider client={clientRef.current}>
      <SafeAreaProvider>
        {/* The app's surfaces are styled light; pin the navigation theme so a
            device in dark mode doesn't get inverted nav backgrounds/text. */}
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
