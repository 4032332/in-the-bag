-- supabase/migrations/20260624222628_family_group_auto_create.sql

CREATE OR REPLACE FUNCTION public.handle_new_user_family_group()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group_id uuid;
BEGIN
  INSERT INTO public.family_groups (name, created_by_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Family',
    NEW.id
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.family_group_members (family_group_id, user_id, role)
  VALUES (v_group_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_family_group ON auth.users;
CREATE TRIGGER on_auth_user_created_family_group
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_family_group();
