import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useTripList } from '../../../hooks/useTripList';
import { useAsyncJob } from '../../../../app/hooks/useAsyncJob';
import TripSelector from './TripSelector';
import UrlInputBar from './UrlInputBar';
import ExtractionResultsList from './ExtractionResultsList';
import DayPickerSheet from './DayPickerSheet';
import QuickAddButton from './QuickAddButton';
import { ExtractionItem, ClassificationLabel } from '../../../types/explore';
import { writeTaskItems, writeEventItems } from './quickAddWriter';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ExtractedItem {
  recommendation: string;
  sourceTimestamp: string | null;
  classification: ClassificationLabel;
}

export default function EnhanceMyTripScreen() {
  const { trips, loading: tripsLoading } = useTripList();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractionItem[]>([]);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [writing, setWriting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { job, isLoading: jobLoading, isFailed } = useAsyncJob(pendingJobId);

  useEffect(() => {
    if (trips.length === 1 && !selectedTripId) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, selectedTripId]);

  useEffect(() => {
    if (job?.status === 'completed' && job.output) {
      const rawItems = ((job.output as Record<string, unknown>).items as ExtractedItem[]) ?? [];
      const extractionItems: ExtractionItem[] = rawItems.map((raw) => ({
        id: generateId(),
        recommendation: raw.recommendation,
        sourceTimestamp: raw.sourceTimestamp,
        classification: raw.classification,
        originalClassification: raw.classification,
        selected: true,
      }));
      setItems(extractionItems);
      setPendingJobId(null);
    } else if (isFailed) {
      Alert.alert('Extraction failed', job?.error ?? 'Something went wrong. Please try again.');
      setPendingJobId(null);
    }
  }, [job?.status, job?.output, job?.error, isFailed]);

  const handleUrlSubmit = useCallback(async (url: string) => {
    if (!selectedTripId) {
      Alert.alert('Select a trip', 'Please select a trip before extracting a URL.');
      return;
    }
    setItems([]);

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const jobType = isYouTube ? 'youtube_extract' : 'tiktok_extract';

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('async_jobs')
      .insert({
        type: jobType,
        status: 'pending',
        input: { url, trip_id: selectedTripId },
        trip_id: selectedTripId,
        user_id: userData.user?.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Failed to queue extraction job. Please try again.');
      return;
    }
    setPendingJobId(data.id);
  }, [selectedTripId]);

  const handleToggleSelected = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }, []);

  const handleToggleClassification = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, classification: item.classification === 'Event' ? 'Task' : 'Event' }
          : item
      )
    );
  }, []);

  const handleQuickAddTap = useCallback(() => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;

    const hasEventItems = selected.some((i) => i.classification === 'Event');

    if (hasEventItems) {
      setDayPickerVisible(true);
    } else {
      handleWriteTasksOnly(selected);
    }
  }, [items]);

  const handleWriteTasksOnly = async (selected: ExtractionItem[]) => {
    if (!selectedTripId) return;
    setWriting(true);
    try {
      await writeTaskItems(selectedTripId, selected);
      const count = selected.length;
      showToast(`${count} task${count !== 1 ? 's' : ''} added to your checklist`);
      setItems([]);
    } catch {
      Alert.alert('Error', 'Failed to add tasks. Please try again.');
    } finally {
      setWriting(false);
    }
  };

  const handleDaySelected = async (tripDayId: string) => {
    setDayPickerVisible(false);
    if (!selectedTripId) return;

    const selected = items.filter((i) => i.selected);
    setWriting(true);
    try {
      await Promise.all([
        writeTaskItems(selectedTripId, selected),
        writeEventItems(selectedTripId, tripDayId, selected),
      ]);
      const taskCount = selected.filter((i) => i.classification === 'Task').length;
      const eventCount = selected.filter((i) => i.classification === 'Event').length;
      const parts: string[] = [];
      if (eventCount > 0) parts.push(`${eventCount} event${eventCount !== 1 ? 's' : ''}`);
      if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''}`);
      showToast(`Added ${parts.join(' and ')}`);
      setItems([]);
    } catch {
      Alert.alert('Error', 'Failed to add items. Please try again.');
    } finally {
      setWriting(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isLoading = !!pendingJobId && jobLoading;

  if (!tripsLoading && trips.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No trips yet</Text>
        <Text style={styles.emptySubtitle}>Create a trip first to use URL extraction.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TripSelector
        trips={trips}
        selectedTripId={selectedTripId}
        onSelect={setSelectedTripId}
      />
      <UrlInputBar onSubmit={handleUrlSubmit} disabled={isLoading || writing || !selectedTripId} />

      {isLoading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Extracting recommendations...</Text>
        </View>
      )}

      {items.length > 0 && !isLoading && (
        <>
          <ExtractionResultsList
            items={items}
            onToggleSelected={handleToggleSelected}
            onToggleClassification={handleToggleClassification}
          />
          <QuickAddButton
            selectedItems={items}
            onQuickAdd={handleQuickAddTap}
            disabled={writing}
          />
        </>
      )}

      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {selectedTripId && (
        <DayPickerSheet
          tripId={selectedTripId}
          visible={dayPickerVisible}
          onDaySelected={handleDaySelected}
          onCancel={() => setDayPickerVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#666' },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toastText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});
