DROP POLICY IF EXISTS "Users can manage channels in their workspaces" ON public.channels;
CREATE POLICY "Owners and admins can manage channels"
  ON public.channels FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = channels.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = channels.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can manage flows in their workspaces" ON public.flows;
CREATE POLICY "Owners and admins can manage flows"
  ON public.flows FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = flows.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = flows.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can manage triggers in one workspace" ON public.triggers;
CREATE POLICY "Owners and admins can manage triggers in one workspace"
  ON public.triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      LEFT JOIN public.channels ch ON ch.id = triggers.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = f.workspace_id
      WHERE f.id = triggers.flow_id
        AND (triggers.channel_id IS NULL OR ch.workspace_id = f.workspace_id)
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flows f
      LEFT JOIN public.channels ch ON ch.id = triggers.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = f.workspace_id
      WHERE f.id = triggers.flow_id
        AND (triggers.channel_id IS NULL OR ch.workspace_id = f.workspace_id)
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "sequences_workspace" ON public.sequences;
CREATE POLICY "Members can view sequences in their workspaces"
  ON public.sequences FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Owners and admins can manage sequences"
  ON public.sequences FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = sequences.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = sequences.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "enrollments_via_sequence_in_one_workspace" ON public.sequence_enrollments;
CREATE POLICY "Members can view enrollments in one workspace"
  ON public.sequence_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.sequences s
      JOIN public.contacts c ON c.id = sequence_enrollments.contact_id
      JOIN public.channels ch ON ch.id = sequence_enrollments.channel_id
      WHERE s.id = sequence_enrollments.sequence_id
        AND s.workspace_id = c.workspace_id
        AND s.workspace_id = ch.workspace_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
CREATE POLICY "Owners and admins can manage enrollments in one workspace"
  ON public.sequence_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.sequences s
      JOIN public.contacts c ON c.id = sequence_enrollments.contact_id
      JOIN public.channels ch ON ch.id = sequence_enrollments.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE s.id = sequence_enrollments.sequence_id
        AND s.workspace_id = c.workspace_id
        AND s.workspace_id = ch.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sequences s
      JOIN public.contacts c ON c.id = sequence_enrollments.contact_id
      JOIN public.channels ch ON ch.id = sequence_enrollments.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE s.id = sequence_enrollments.sequence_id
        AND s.workspace_id = c.workspace_id
        AND s.workspace_id = ch.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can manage broadcasts in their workspaces" ON public.broadcasts;
CREATE POLICY "Owners and admins can manage broadcasts"
  ON public.broadcasts FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = broadcasts.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = broadcasts.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can insert broadcast recipients in one workspace" ON public.broadcast_recipients;
DROP POLICY IF EXISTS "Users can update broadcast recipients in one workspace" ON public.broadcast_recipients;
CREATE POLICY "Owners and admins can insert broadcast recipients in one workspace"
  ON public.broadcast_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Owners and admins can update broadcast recipients in one workspace"
  ON public.broadcast_recipients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "flow_versions_insert" ON public.flow_versions;
CREATE POLICY "Owners and admins can insert flow versions"
  ON public.flow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flows f
      JOIN public.workspace_members wm ON wm.workspace_id = f.workspace_id
      WHERE f.id = flow_versions.flow_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
