import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '../utils/auth';
import { fetchLegalAcceptance, isLegalAcceptanceComplete } from '../utils/legalAcceptance';
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

const PUBLIC_ROUTES = new Set(['login', 'planes', 'legal']);

function AuthGate({ children }) {
  const { isReady, isAuthenticated, user } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const onPublic = PUBLIC_ROUTES.has(segments[0]);
  const onLogin = segments[0] === 'login';
  const onLegal = segments[0] === 'legal';
  const onLegalAcceptance = segments[0] === 'legal-acceptance';
  const [legalReady, setLegalReady] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalAcceptance() {
      if (!isReady) return;
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) {
          setLegalAccepted(false);
          setLegalReady(true);
        }
        return;
      }

      setLegalReady(false);
      try {
        const row = await fetchLegalAcceptance(user.id);
        if (!cancelled) {
          setLegalAccepted(isLegalAcceptanceComplete(row));
        }
      } catch (error) {
        console.error('Error checking legal acceptance:', error);
        if (!cancelled) {
          setLegalAccepted(false);
        }
      } finally {
        if (!cancelled) {
          setLegalReady(true);
        }
      }
    }

    loadLegalAcceptance();
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();
    if (!isAuthenticated && !onPublic) {
      router.replace('/login');
      return;
    }
    if (!isAuthenticated) return;
    if (!legalReady) return;
    if (!legalAccepted && !onLegalAcceptance && !onLegal) {
      router.replace('/legal-acceptance');
      return;
    }
    if (legalAccepted && (onLogin || onLegalAcceptance)) {
      router.replace('/(tabs)');
    }
  }, [
    isReady,
    isAuthenticated,
    onPublic,
    onLogin,
    onLegal,
    onLegalAcceptance,
    legalReady,
    legalAccepted,
    router,
  ]);

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
  if (isAuthenticated && !legalReady) return Spinner;
  if (isAuthenticated && !legalAccepted && !onLegalAcceptance && !onLegal) return Spinner;
  if (isAuthenticated && legalAccepted && (onLogin || onLegalAcceptance)) return Spinner;
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
            <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="legal-acceptance" options={{ animation: 'slide_from_right' }} />
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
