import { View, Text, StyleSheet } from 'react-native';
export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <Text style={styles.empty}>Your travel statistics will appear here.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 32 },
});
