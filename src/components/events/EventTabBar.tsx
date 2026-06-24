import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

type EventTab = 'details' | 'inTheBag' | 'documents' | 'tickets';

const TAB_LABELS: Record<EventTab, string> = {
  details: 'Details',
  inTheBag: 'In the Bag',
  documents: 'Documents',
  tickets: 'Tickets',
};

interface Props {
  activeTab: EventTab;
  visibility: { details: boolean; inTheBag: boolean; documents: boolean; tickets: boolean };
  onSelectTab: (tab: EventTab) => void;
}

export function EventTabBar({ activeTab, visibility, onSelectTab }: Props) {
  const tabs = (Object.keys(TAB_LABELS) as EventTab[]).filter((t) => visibility[t]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => onSelectTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {TAB_LABELS[tab]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: '#1a1a2e' },
  tabText: { fontSize: 14, color: '#555', fontWeight: '500' },
  tabTextActive: { color: '#fff' },
});
