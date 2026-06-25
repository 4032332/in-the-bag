import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/providers/AuthProvider';
import { DemoModeProvider } from '../src/providers/DemoModeProvider';
import { DemoBanner } from '../src/components/DemoBanner';
import { StyleSheet } from 'react-native';
import { registerActionCategories } from '../src/notifications/NotificationService';
import { GlobalNotificationListener } from '../src/components/GlobalNotificationListener';
import { initNotificationHandler } from '../src/notifications/NotificationHandler';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    registerActionCategories().catch(console.error);
    initNotificationHandler(router);
  }, [router]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <GlobalNotificationListener />
        <DemoModeProvider>
          <DemoBanner />
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </DemoModeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
