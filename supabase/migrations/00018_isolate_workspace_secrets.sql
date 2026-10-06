CREATE TABLE IF NOT EXISTS public.workspace_secrets (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  late_api_key_encrypted text,
  ai_api_key text,
  webhook_secret text
);

CREATE TABLE IF NOT EXISTS public.channel_secrets (
  channel_id uuid PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  webhook_secret text
);

INSERT INTO public.workspace_secrets (
  workspace_id,
  late_api_key_encrypted,
  ai_api_key,
  webhook_secret
)
SELECT
  id,
  late_api_key_encrypted,
  ai_api_key,
  webhook_secret
FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO public.channel_secrets (channel_id, webhook_secret)
SELECT id, webhook_secret
FROM public.channels
WHERE webhook_secret IS NOT NULL
ON CONFLICT (channel_id) DO NOTHING;

ALTER TABLE public.workspace_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_secrets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.channel_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.workspace_secrets TO service_role;
GRANT ALL ON TABLE public.channel_secrets TO service_role;

DROP POLICY IF EXISTS "Users can update their workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS late_api_key_encrypted,
  DROP COLUMN IF EXISTS ai_api_key,
  DROP COLUMN IF EXISTS webhook_secret;

ALTER TABLE public.channels
  DROP COLUMN IF EXISTS webhook_secret;
