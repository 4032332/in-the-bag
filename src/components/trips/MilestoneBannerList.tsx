import React, { useEffect, useState, useCallback } from 'react';
import { Alert, View } from 'react-native';
import { parseISO } from 'date-fns';
import { MilestoneBannerState } from '../../types/database';
import { MilestoneBanner } from './MilestoneBanner';
import { getVisibleBanners, getDismissedBannerKeys, dismissBanner, snoozeBanner } from '../../services/milestoneBanners';

const BANNER_WINDOWS: Record<MilestoneBannerState['banner_key'], number> = {
  insurance_30d: 30,
  visa_14d: 14,
  esim_7d: 7,
  offline_docs_7d: 7,
  wifi_day_of: 0,
};

interface Props {
  tripId: string;
  userId: string;
  tripStartDate: string;
}

export function MilestoneBannerList({ tripId, userId, tripStartDate }: Props) {
  const [visibleBanners, setVisibleBanners] = useState<MilestoneBannerState['banner_key'][]>([]);

  const refresh = useCallback(async () => {
    const today = new Date();
    const departure = parseISO(tripStartDate);
    const daysUntilDeparture = Math.ceil((departure.getTime() - today.getTime()) / 86400000);

    const windowActive = (Object.keys(BANNER_WINDOWS) as MilestoneBannerState['banner_key'][]).filter(
      (key) => daysUntilDeparture <= BANNER_WINDOWS[key]
    );

    if (windowActive.length === 0) { setVisibleBanners([]); return; }

    const [dbVisible, dismissedKeys] = await Promise.all([
      getVisibleBanners(tripId, userId),
      getDismissedBannerKeys(tripId, userId),
    ]);
    const visibleKeys = new Set(dbVisible.map((b) => b.banner_key));
    const dismissedSet = new Set(dismissedKeys);

    // Show: window-active banners that are visible in DB, OR have no DB record at all (never interacted with)
    const toShow = windowActive.filter((key) => visibleKeys.has(key) || !dismissedSet.has(key));

    setVisibleBanners(toShow);
  }, [tripId, userId, tripStartDate]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleConfirm(key: MilestoneBannerState['banner_key']) {
    try {
      await dismissBanner(tripId, userId, key, 'confirm');
      await refresh();
    } catch (e) {
      Alert.alert('Error', 'Could not confirm banner. Please try again.');
    }
  }
  async function handleDismiss(key: MilestoneBannerState['banner_key']) {
    try {
      await dismissBanner(tripId, userId, key, 'dismiss');
      await refresh();
    } catch (e) {
      Alert.alert('Error', 'Could not dismiss banner. Please try again.');
    }
  }
  async function handleSnooze(key: MilestoneBannerState['banner_key']) {
    try {
      await snoozeBanner(tripId, userId, key);
      await refresh();
    } catch (e) {
      Alert.alert('Error', 'Could not snooze banner. Please try again.');
    }
  }

  if (visibleBanners.length === 0) return null;

  return (
    <View>
      {visibleBanners.map((key) => (
        <MilestoneBanner
          key={key}
          bannerKey={key}
          onConfirm={() => handleConfirm(key)}
          onDismiss={() => handleDismiss(key)}
          onSnooze={() => handleSnooze(key)}
        />
      ))}
    </View>
  );
}
