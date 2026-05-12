import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession, AuthProvider } from '../utils/auth';
import { useCurrentRestaurant } from '../utils/restaurant/useCurrentRestaurant';
import { fetchLegalAcceptance, isLegalAcceptanceComplete } from '../utils/legalAcceptance';
import { LegalAcceptanceContext } from '../utils/legalAcceptanceContext';
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
  const restaurantQuery = useCurrentRestaurant();
  const router = useRouter();
  const segments = useSegments();
  const onPublic = PUBLIC_ROUTES.has(segments[0]);
  const onLogin = segments[0] === 'login';
  const onSetup = segments[0] === 'setup';
  const onLegal = segments[0] === 'legal';
  const onLegalAcceptance = segments[0] === 'legal-acceptance';

  const restaurantReady = !isAuthenticated || !restaurantQuery.isLoading;
  const restaurant = restaurantQuery.data;
  const needsSetup = isAuthenticated && restaurant && restaurant.setup_completed === false;

  const [legalReady, setLegalReady] = useState(false);
  const { legalAccepted, setLegalAccepted } = useContext(LegalAcceptanceContext);
  // Tracks the user.id for which we completed a real legal fetch.
  // Prevents a stale legalReady=true (from the "not authenticated" early-return path)
  // from triggering a premature redirect before the actual fetch finishes.
  const legalCheckedForRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalAcceptance() {
      if (!isReady || !isAuthenticated || !user?.id) {
        if (!cancelled) {
          setLegalAccepted(false);
          setLegalReady(true);
          // Reset ref so the same user re-logging in doesn't skip the fetch
          if (!isAuthenticated) legalCheckedForRef.current = null;
        }
        return;
      }
      if (!restaurantReady || needsSetup) return;

      setLegalReady(false);
      try {
        const row = await fetchLegalAcceptance(user.id);
        if (!cancelled) {
          setLegalAccepted(isLegalAcceptanceComplete(row));
          legalCheckedForRef.current = user.id;
        }
      } catch (error) {
        console.error('Error checking legal acceptance:', error);
        if (!cancelled) setLegalAccepted(false);
      } finally {
        if (!cancelled) setLegalReady(true);
      }
    }

    loadLegalAcceptance();
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, user?.id, restaurantReady, needsSetup]);

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated && !restaurantReady) return;
    SplashScreen.hideAsync();

    if (!isAuthenticated && !onPublic) { router.replace('/login'); return; }
    if (!isAuthenticated) return;

    // 1. Setup wizard
    if (needsSetup && !onSetup) { router.replace('/setup'); return; }
    if (needsSetup) return;

    // 2. Legal acceptance — sólo actuar cuando el fetch sea para este usuario concreto
    if (!legalReady || legalCheckedForRef.current !== user?.id) return;
    if (!legalAccepted && !onLegalAcceptance && !onLegal) {
      router.replace('/legal-acceptance');
      return;
    }

    // 3. Todo OK -> tabs
    if (onLogin || onLegalAcceptance) router.replace('/(tabs)');
  }, [
    isReady, isAuthenticated, restaurantReady, needsSetup,
    legalReady, legalAccepted,
    onPublic, onLogin, onSetup, onLegal, onLegalAcceptance, router, user?.id,
  ]);

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
  if (isAuthenticated && !needsSetup && (
    !legalReady || legalCheckedForRef.current !== user?.id
  ) && !onLegalAcceptance && !onLegal) return Spinner;
  if (isAuthenticated && !needsSetup && legalAccepted && (onLogin || onLegalAcceptance)) return Spinner;
  return children;
}

export default function RootLayout() {
  const [legalAccepted, setLegalAccepted] = useState(false);
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <LegalAcceptanceContext.Provider value={{ legalAccepted, setLegalAccepted }}>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="planes" options={{ animation: 'fade' }} />
                <Stack.Screen name="setup" options={{ animation: 'fade' }} />
                <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="legal-acceptance" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                  name="products/[id]"
                  options={{
                    presentation: 'card',
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="recipes/[id]"
                  options={{
                    presentation: 'card',
                    animation: 'slide_from_right',
                  }}
                />
              </Stack>
            </AuthGate>
          </LegalAcceptanceContext.Provider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AuthProvider>
  );
}
