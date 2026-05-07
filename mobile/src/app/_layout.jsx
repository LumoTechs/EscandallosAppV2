import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '../utils/auth';
import { useCurrentRestaurant } from '../utils/restaurant/useCurrentRestaurant';
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
  const restaurantQuery = useCurrentRestaurant();
  const router = useRouter();
  const segments = useSegments();
  const onPublic = PUBLIC_ROUTES.has(segments[0]);
  const onLogin = segments[0] === 'login';
  const onSetup = segments[0] === 'setup';

  // El restaurant query solo arranca si está autenticado, así que esperar su
  // resolución sólo bloquea cuando hay sesión.
  const restaurantReady = !isAuthenticated || !restaurantQuery.isLoading;
  const restaurant = restaurantQuery.data;
  const needsSetup = isAuthenticated && restaurant && restaurant.setup_completed === false;

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated && !restaurantReady) return;
    SplashScreen.hideAsync();

    if (!isAuthenticated && !onPublic) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated && onLogin) {
      // En primer login con setup_completed=false, mandar al wizard. Si ya está completo, a tabs.
      router.replace(needsSetup ? '/setup' : '/(tabs)');
      return;
    }
    if (isAuthenticated && needsSetup && !onSetup) {
      router.replace('/setup');
    }
  }, [isReady, isAuthenticated, restaurantReady, needsSetup, onPublic, onLogin, onSetup, router]);

  const Spinner = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <ActivityIndicator color={T.primary} />
    </View>
  );
  if (!isReady) return Spinner;
  if (isAuthenticated && !restaurantReady) return Spinner;
  if (!isAuthenticated && !onPublic) return Spinner;
  if (isAuthenticated && onLogin) return Spinner;
  if (isAuthenticated && needsSetup && !onSetup) return Spinner;
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
            <Stack.Screen name="setup" options={{ animation: 'fade' }} />
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
