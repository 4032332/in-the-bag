/** Maximum zoom (default opening scale). Cannot zoom in further. */
export const ZOOM_DEFAULT = 1.0;

/** Threshold below which tiles show day number + weekday + date only (no event count). */
export const ZOOM_MID_THRESHOLD = 0.72;

/** Minimum zoom (pinch limit). Below this threshold tiles show "DAY N" only. */
export const ZOOM_MIN_THRESHOLD = 0.45;

/** Hard minimum scale — cannot pinch out further than this. */
export const ZOOM_MIN = 0.35;
