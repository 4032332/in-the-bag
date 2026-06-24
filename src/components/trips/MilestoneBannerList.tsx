import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { parseISO } from 'date-fns';
import { MilestoneBannerState } from '../../types/database';
import { MilestoneBanner } from './MilestoneBanner';
import { getVisibleBanners, dismissBanner, snoozeBanner } from '../../services/milestoneBanners';

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

    const dbVisible = await getVisibleBanners(tripId, userId);
    const dbKeys = new Set(dbVisible.map((b) => b.banner_key));

    // Show banners that are window-active AND either: have a DB record (not dismissed/snoozed) OR have no record yet (never shown)
    const allDbKeys = new Set(dbVisible.map((b) => b.banner_key));
    const toShow = windowActive.filter((key) => {
      if (dbKeys.has(key)) return true; // in DB and passed visibility filter
      if (!allDbKeys.has(key)) return true; // never interacted with
      return false; // in DB but filtered out (dismissed/snoozed)
    });

    setVisibleBanners(toShow);
  }, [tripId, userId, tripStartDate]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleConfirm(key: MilestoneBannerState['banner_key']) {
    await dismissBanner(tripId, userId, key, 'confirm');
    refresh();
  }
  async function handleDismiss(key: MilestoneBannerState['banner_key']) {
    await dismissBanner(tripId, userId, key, 'dismiss');
    refresh();
  }
  async function handleSnooze(key: MilestoneBannerState['banner_key']) {
    await snoozeBanner(tripId, userId, key);
    refresh();
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
