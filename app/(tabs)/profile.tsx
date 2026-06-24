import { View, Text, StyleSheet } from 'react-native';
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.empty}>Your profile and family members will appear here.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 32 },
});
