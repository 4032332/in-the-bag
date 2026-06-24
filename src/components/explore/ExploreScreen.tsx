import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import FindHolidayScreen from './FindHoliday/FindHolidayScreen';
import EnhanceMyTripScreen from './EnhanceMyTrip/EnhanceMyTripScreen';

type Mode = 'find' | 'enhance';

export default function ExploreScreen() {
  const [mode, setMode] = useState<Mode>('find');

  return (
    <View style={styles.container}>
      <SegmentedControl
        values={['Find a Holiday', 'Enhance My Trip']}
        selectedIndex={mode === 'find' ? 0 : 1}
        onChange={(e) => setMode(e.nativeEvent.selectedSegmentIndex === 0 ? 'find' : 'enhance')}
        style={styles.segmentedControl}
      />
      {mode === 'find' ? <FindHolidayScreen /> : <EnhanceMyTripScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentedControl: { margin: 16 },
});
