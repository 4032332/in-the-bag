// src/components/in-the-bag/InTheBagSheet.tsx
import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { TripLevelView } from './TripLevelView';
import { DayLevelView } from './DayLevelView';
import { EventLevelView } from './EventLevelView';

export type InTheBagSheetScope =
  | {
      kind: 'trip';
      tripId: string;
      isPremium: boolean;
      aiJobStatus: 'idle' | 'loading' | 'complete';
    }
  | {
      kind: 'day';
      tripId: string;
      tripDayId: string;
      events: { id: string; title: string }[];
      isPremium: boolean;
      aiJobStatus?: 'idle' | 'loading' | 'complete';
    }
  | {
      kind: 'event';
      tripId: string;
      eventId: string;
      eventTitle: string;
      isPremium: boolean;
      aiJobStatus?: 'idle' | 'loading' | 'complete';
    };

interface Props {
  scope: InTheBagSheetScope;
  isOpen: boolean;
  onClose: () => void;
  onUpgradePress: () => void;
}

const SNAP_POINTS = ['50%', '85%'];

export function InTheBagSheet({ scope, isOpen, onClose, onUpgradePress }: Props) {
  const sheetRef = useRef<BottomSheet>(null);

  // Open/close driven by isOpen prop
  React.useEffect(() => {
    if (isOpen) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        onPress={onClose}
      />
    ),
    [onClose],
  );

  const sheetTitle = useMemo(() => {
    if (scope.kind === 'trip') return 'In the Bag — Whole Trip';
    if (scope.kind === 'day') return 'In the Bag — Today';
    return `In the Bag — ${scope.eventTitle}`;
  }, [scope]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{sheetTitle}</Text>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close packing list">
          <Text style={styles.closeLabel}>Done</Text>
        </TouchableOpacity>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {scope.kind === 'trip' && (
          <TripLevelView
            tripId={scope.tripId}
            isPremium={scope.isPremium}
            aiJobStatus={scope.aiJobStatus}
            onUpgradePress={onUpgradePress}
          />
        )}
        {scope.kind === 'day' && (
          <DayLevelView
            tripId={scope.tripId}
            tripDayId={scope.tripDayId}
            events={scope.events}
            isPremium={scope.isPremium}
            onUpgradePress={onUpgradePress}
            aiJobStatus={scope.aiJobStatus ?? 'idle'}
          />
        )}
        {scope.kind === 'event' && (
          <EventLevelView
            tripId={scope.tripId}
            eventId={scope.eventId}
            eventTitle={scope.eventTitle}
            isPremium={scope.isPremium}
            onUpgradePress={onUpgradePress}
            aiJobStatus={scope.aiJobStatus ?? 'idle'}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    backgroundColor: '#CCC',
    width: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeLabel: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    paddingBottom: 40,
  },
});
