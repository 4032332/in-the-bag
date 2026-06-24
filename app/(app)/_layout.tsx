import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="history" options={{ title: 'Trip History' }} />
      <Stack.Screen name="trips/create" options={{ title: 'Create Trip', presentation: 'modal' }} />
    </Stack>
  );
}
