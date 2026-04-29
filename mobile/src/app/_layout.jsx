import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '../utils/auth';
import { T } from '../theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLIC_ROUTES = new Set(['login', 'planes']);

function AuthGate({ children }) {
  const { isReady, isAuthenticated } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const onPublic = PUBLIC_ROUTES.has(segments[0]);
  const onLogin = segments[0] === 'login';

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();
    if (!isAuthenticated && !onPublic) {
      router.replace('/login');
    } else if (isAuthenticated && onLogin) {
      router.replace('/(tabs)');
    }
  }, [isReady, isAuthenticated, onPublic, onLogin, router]);

  // Bloquear el render de hijos hasta que la ruta y el estado de sesión casen.
  // Si no, las pantallas protegidas montan brevemente antes del replace y
  // disparan fetches/efectos que el usuario no autorizado no debería ver.
  const Spinner = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <ActivityIndicator color={T.primary} />
    </View>
  );
  if (!isReady) return Spinner;
  if (!isAuthenticated && !onPublic) return Spinner;
  if (isAuthenticated && onLogin) return Spinner;
  return children;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="planes" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="products/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
