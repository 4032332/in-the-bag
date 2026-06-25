-- supabase/migrations/20260624223250_delete_current_user_rpc.sql
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
