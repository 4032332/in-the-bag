-- RPC: evaluate_trip_sponsor(trip_id uuid)
-- Updates is_premium_sponsor flags for all participants on a trip.
-- Caller must be a participant of the trip.
CREATE OR REPLACE FUNCTION evaluate_trip_sponsor(trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the calling user is a participant of this trip.
  IF NOT EXISTS (
    SELECT 1 FROM trip_participants
    WHERE trip_participants.trip_id = $1
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant of this trip';
  END IF;

  -- Clear existing sponsor flags for this trip
  UPDATE trip_participants
  SET is_premium_sponsor = false
  WHERE trip_participants.trip_id = $1;

  -- Set new sponsor if an active premium subscriber exists among participants
  UPDATE trip_participants
  SET is_premium_sponsor = true
  WHERE trip_participants.trip_id = $1
    AND user_id = (
      SELECT tp.user_id
      FROM trip_participants tp
      JOIN subscriptions s ON s.user_id = tp.user_id
      WHERE tp.trip_id = $1
        AND tp.user_id IS NOT NULL
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
      ORDER BY tp.user_id ASC
      LIMIT 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION evaluate_trip_sponsor(uuid) TO authenticated;
