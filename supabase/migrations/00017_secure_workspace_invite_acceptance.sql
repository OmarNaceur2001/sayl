-- Invitees must not be able to update any field on an invite. Acceptance is
-- performed atomically by the authenticated RPC below.
DROP POLICY IF EXISTS workspace_invites_update ON public.workspace_invites;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.workspace_invites%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT pg_catalog.lower(users.email)
  INTO v_user_email
  FROM auth.users AS users
  WHERE users.id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated account has no email address'
      USING ERRCODE = '28000';
  END IF;

  SELECT invites.*
  INTO v_invite
  FROM public.workspace_invites AS invites
  WHERE invites.id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite is no longer valid' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at IS NULL OR v_invite.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'This invite has expired' USING ERRCODE = 'P0001';
  END IF;

  IF pg_catalog.lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'This invite was sent to a different email address'
      USING ERRCODE = '42501';
  END IF;

  IF v_invite.role NOT IN ('member', 'admin') THEN
    RAISE EXCEPTION 'This invite has an invalid role' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN v_invite.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_workspace_invite(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(uuid) TO authenticated;
