-- supabase/migrations/20260623000000_in_the_bag_rls.sql
-- (No-op check: Table in_the_bag_items and its base schema already created in Plan 1 base schema dump)
-- Just adding the specific RLS policies for Plan 3.

ALTER TABLE public.in_the_bag_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select items for trips they participate in"
ON public.in_the_bag_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants tp
    WHERE tp.trip_id = in_the_bag_items.trip_id
    AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert items for trips they participate in"
ON public.in_the_bag_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_participants tp
    WHERE tp.trip_id = in_the_bag_items.trip_id
    AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items for trips they participate in"
ON public.in_the_bag_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants tp
    WHERE tp.trip_id = in_the_bag_items.trip_id
    AND tp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_participants tp
    WHERE tp.trip_id = in_the_bag_items.trip_id
    AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items for trips they participate in"
ON public.in_the_bag_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_participants tp
    WHERE tp.trip_id = in_the_bag_items.trip_id
    AND tp.user_id = auth.uid()
  )
);
