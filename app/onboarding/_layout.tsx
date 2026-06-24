import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="demo-tier" options={{ gestureEnabled: false, headerShown: false }} />
    </Stack>
  );
}
