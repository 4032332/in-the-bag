import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

interface Props {
  visible: boolean;
  cities: string[];
  onClose: () => void;
}

export function CityListModal({ visible, cities, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cities Visited</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.closeBtn}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={cities}
          keyExtractor={(item, i) => `${item}-${i}`}
          renderItem={({ item }) => <Text style={styles.item}>{item}</Text>}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 17, fontWeight: '600' },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 16, color: '#007AFF' },
  item: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E0E0E0', marginLeft: 16 },
});
