import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>In the Bag</Text>
      <Text style={styles.tagline}>Your holiday, perfectly planned.</Text>
      <Link href="/onboarding/auth" style={styles.cta}>
        <Text style={styles.ctaText}>Get Started</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16 },
  title: { fontSize: 36, fontWeight: '700' },
  tagline: { fontSize: 16, color: '#666' },
  cta: { marginTop: 32, backgroundColor: '#1a1a2e', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
