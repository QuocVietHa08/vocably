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

import { SettingsProvider } from '@/src/context/SettingsContext';
// import { AuthProvider, useAuth } from '@/src/context/AuthContext';
// import { PurchasesProvider } from '@/src/context/PurchasesContext';
import { WELCOME_SEEN_KEY } from './welcome';

// Keep the splash screen visible while fonts + auth load
SplashScreen.preventAutoHideAsync();

/* ─── Navigation guard ─────────────────────────────────────────── */

function NavigationGuard() {
  const router             = useRouter();
  const segments           = useSegments();
  // const { user, loading }  = useAuth(); // TODO: re-enable when auth is configured
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  // Load welcome flag
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((val) => {
      setWelcomeSeen(val === 'true');
    });
  }, []);

  // Redirect based on state
  useEffect(() => {
    // TODO: re-enable auth when Supabase is configured
    // if (loading || welcomeSeen === null) return;
    if (welcomeSeen === null) return;

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'welcome';

    if (!welcomeSeen) {
      router.replace('/welcome');
    }
    // else if (!user && !inAuthGroup) {
    //   router.replace('/auth');
    // } else if (user && inAuthGroup) {
    //   router.replace('/');
    // }
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
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
