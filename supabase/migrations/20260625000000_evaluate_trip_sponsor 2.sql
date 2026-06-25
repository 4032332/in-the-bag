-- RPC: evaluate_trip_sponsor(trip_id uuid)
CREATE OR REPLACE FUNCTION evaluate_trip_sponsor(trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing sponsor flags for this trip
  UPDATE trip_participants 
  SET is_premium_sponsor = false 
  WHERE trip_id = $1;

  -- Set new sponsor if an active premium subscriber exists
  UPDATE trip_participants 
  SET is_premium_sponsor = true
  WHERE trip_id = $1 
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
