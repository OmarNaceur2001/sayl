-- Manual RLS regression test:
-- Replace the three UUID placeholders before running in a Supabase SQL session.
-- The authenticated user must belong to the contact's workspace; the channel
-- must belong to a different workspace. The insert must be rejected by RLS.
BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  'REPLACE_WITH_AUTH_USER_UUID',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.contact_channels (
      contact_id,
      channel_id,
      platform_sender_id
    )
    VALUES (
      'REPLACE_WITH_CONTACT_UUID'::uuid,
      'REPLACE_WITH_CHANNEL_IN_ANOTHER_WORKSPACE_UUID'::uuid,
      'cross-workspace-rls-test'
    );

    RAISE EXCEPTION 'Cross-workspace contact_channels insert unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Cross-workspace contact_channels insert rejected by RLS as expected';
  END;
END;
$$;

ROLLBACK;
