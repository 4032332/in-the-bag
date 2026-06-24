import { View, Text, StyleSheet } from 'react-native';
export default function PlusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>+</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  label: { fontSize: 48, color: '#ccc' },
});
