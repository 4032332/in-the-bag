-- accept_family_invitation(p_token uuid)
--
-- Security-definer RPC so the invitee can insert into family_group_members
-- without being the group owner (which RLS on that table requires for direct inserts).
-- All validation is atomic inside this function: token lookup, status/expiry checks,
-- member insert, and invitation status update happen in a single transaction.

CREATE OR REPLACE FUNCTION public.accept_family_invitation(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation  family_invitations%ROWTYPE;
  v_user_id     uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be logged in to accept invitation';
  END IF;

  -- Lock the row to prevent concurrent acceptance of the same token
  SELECT * INTO v_invitation
  FROM family_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is %', v_invitation.status;
  END IF;

  IF v_invitation.expires_at < NOW() THEN
    UPDATE family_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- Insert member — bypasses RLS because this function is SECURITY DEFINER.
  -- ON CONFLICT DO NOTHING is safe: if already a member, acceptance still succeeds.
  INSERT INTO family_group_members (family_group_id, user_id, role)
  VALUES (v_invitation.family_group_id, v_user_id, v_invitation.family_role)
  ON CONFLICT (family_group_id, user_id) DO NOTHING;

  -- Mark invitation accepted
  UPDATE family_invitations
  SET status = 'accepted', responded_at = NOW()
  WHERE id = v_invitation.id;

  RETURN json_build_object('group_id', v_invitation.family_group_id);
END;
$$;

-- Revoke direct execute from public; only authenticated users may call this
REVOKE EXECUTE ON FUNCTION public.accept_family_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(uuid) TO authenticated;
