import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SettingsProvider } from '@/src/context/SettingsContext';
// import { AuthProvider, useAuth } from '@/src/context/AuthContext';
// import { PurchasesProvider } from '@/src/context/PurchasesContext';
import { WELCOME_SEEN_KEY } from './welcome';

// Keep the splash screen visible while fonts + auth load.
// Wrapped in try/catch because Expo Go doesn't register a native splash for the
// app's view controller — this throws in Expo Go but works correctly in dev/prod builds.
try { SplashScreen.preventAutoHideAsync(); } catch { /* Expo Go — no-op */ }

/* ─── Navigation guard ─────────────────────────────────────────── */

function NavigationGuard() {
  const router             = useRouter();
  const segments           = useSegments();
  // const { user, loading }  = useAuth(); // TODO: re-enable when auth is configured
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  // Load welcome flag
  useEffect(() => {
    // TODO (onboarding): swap this back to AsyncStorage.getItem when onboarding is ready to gate access
    // AsyncStorage.getItem(WELCOME_SEEN_KEY).then((val) => {
    //   setWelcomeSeen(val === 'true');
    // });

    // Temporarily skip onboarding — go straight to the main app
    setWelcomeSeen(true);
  }, []);

  // Redirect based on state
  useEffect(() => {
    if (welcomeSeen === null) return;

    // TODO (onboarding): restore the welcome redirect when onboarding is ready to gate access
    // if (!welcomeSeen) router.replace('/welcome');
  }, [welcomeSeen, segments]);

  return null;
}

/* ─── Root layout ──────────────────────────────────────────────── */

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { /* Expo Go — no native splash registered */ });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
        <SettingsProvider>
          {/* <AuthProvider> */}
          {/* <PurchasesProvider> */}
              <StatusBar style="auto" />
              <NavigationGuard />
              <Stack
                screenOptions={{
                  headerShown:  false,
                  animation:    'slide_from_right',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
          {/* </PurchasesProvider> */}
          {/* </AuthProvider> */}
        </SettingsProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
