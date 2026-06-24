import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/providers/AuthProvider';
import { DemoModeProvider } from '../src/providers/DemoModeProvider';
import { DemoBanner } from '../src/components/DemoBanner';
import { StyleSheet } from 'react-native';
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
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
