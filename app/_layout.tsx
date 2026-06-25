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

import { initRevenueCat } from '../src/lib/revenuecat';

import { SubscriptionProvider } from '../src/context/SubscriptionContext';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    registerActionCategories().catch(console.error);
    initNotificationHandler(router);
    initRevenueCat();
  }, [router]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url)
      if (parsed.hostname === 'invite' && parsed.queryParams?.token) {
        const token = parsed.queryParams.token as string

        // Guard: if no session yet, store the token and let the auth flow pick it up
        // after sign-in. Without this guard the user sees a confusing "Must be logged in"
        // alert when the deep link fires before AuthProvider restores the session.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          sessionStorage.set('pending_invitation_token', token)
          return
        }

        try {
          await acceptInvitationByToken(token)
          router.replace('/(tabs)/profile/family-members')
        } catch (err: any) {
          Alert.alert('Invitation Error', err.message)
        }
      }
    }

    // Process any token that was deferred from a previous cold launch before sign-in
    const processPendingToken = async () => {
      const pending = sessionStorage.getString('pending_invitation_token')
      if (!pending) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      sessionStorage.delete('pending_invitation_token')
      try {
        await acceptInvitationByToken(pending)
        router.replace('/(tabs)/profile/family-members')
      } catch (err: any) {
        Alert.alert('Invitation Error', err.message)
      }
    }

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') processPendingToken()
    })

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url) })
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    return () => {
      sub.remove()
      authSub.unsubscribe()
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <GlobalNotificationListener />
        <DemoModeProvider>
          <SubscriptionProvider>
            <DemoBanner />
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </SubscriptionProvider>
        </DemoModeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
