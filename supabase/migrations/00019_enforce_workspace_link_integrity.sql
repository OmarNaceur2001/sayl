DROP POLICY IF EXISTS "Users can view contact channels via contact" ON public.contact_channels;
DROP POLICY IF EXISTS "Users can manage contact channels" ON public.contact_channels;
CREATE POLICY "Users can view contact channels in one workspace"
  ON public.contact_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.channels ch ON ch.id = contact_channels.channel_id
      WHERE c.id = contact_channels.contact_id
        AND c.workspace_id = ch.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );
CREATE POLICY "Users can manage contact channels in one workspace"
  ON public.contact_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.channels ch ON ch.id = contact_channels.channel_id
      WHERE c.id = contact_channels.contact_id
        AND c.workspace_id = ch.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.channels ch ON ch.id = contact_channels.channel_id
      WHERE c.id = contact_channels.contact_id
        AND c.workspace_id = ch.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view contact tags" ON public.contact_tags;
DROP POLICY IF EXISTS "Users can manage contact tags" ON public.contact_tags;
CREATE POLICY "Users can view contact tags in one workspace"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.tags t ON t.id = contact_tags.tag_id
      WHERE c.id = contact_tags.contact_id
        AND c.workspace_id = t.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );
CREATE POLICY "Users can manage contact tags in one workspace"
  ON public.contact_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.tags t ON t.id = contact_tags.tag_id
      WHERE c.id = contact_tags.contact_id
        AND c.workspace_id = t.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.tags t ON t.id = contact_tags.tag_id
      WHERE c.id = contact_tags.contact_id
        AND c.workspace_id = t.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view contact custom fields" ON public.contact_custom_fields;
DROP POLICY IF EXISTS "Users can manage contact custom fields" ON public.contact_custom_fields;
CREATE POLICY "Users can view contact custom fields in one workspace"
  ON public.contact_custom_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.custom_field_definitions d ON d.id = contact_custom_fields.field_id
      WHERE c.id = contact_custom_fields.contact_id
        AND c.workspace_id = d.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );
CREATE POLICY "Users can manage contact custom fields in one workspace"
  ON public.contact_custom_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.custom_field_definitions d ON d.id = contact_custom_fields.field_id
      WHERE c.id = contact_custom_fields.contact_id
        AND c.workspace_id = d.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      JOIN public.custom_field_definitions d ON d.id = contact_custom_fields.field_id
      WHERE c.id = contact_custom_fields.contact_id
        AND c.workspace_id = d.workspace_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view triggers via flow" ON public.triggers;
DROP POLICY IF EXISTS "Users can manage triggers via flow" ON public.triggers;
CREATE POLICY "Users can view triggers in one workspace"
  ON public.triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      LEFT JOIN public.channels ch ON ch.id = triggers.channel_id
      WHERE f.id = triggers.flow_id
        AND (triggers.channel_id IS NULL OR ch.workspace_id = f.workspace_id)
        AND public.is_workspace_member(f.workspace_id)
    )
  );
CREATE POLICY "Users can manage triggers in one workspace"
  ON public.triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      LEFT JOIN public.channels ch ON ch.id = triggers.channel_id
      WHERE f.id = triggers.flow_id
        AND (triggers.channel_id IS NULL OR ch.workspace_id = f.workspace_id)
        AND public.is_workspace_member(f.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flows f
      LEFT JOIN public.channels ch ON ch.id = triggers.channel_id
      WHERE f.id = triggers.flow_id
        AND (triggers.channel_id IS NULL OR ch.workspace_id = f.workspace_id)
        AND public.is_workspace_member(f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view flow sessions via flow" ON public.flow_sessions;
CREATE POLICY "Users can view flow sessions in one workspace"
  ON public.flow_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      JOIN public.contacts c ON c.id = flow_sessions.contact_id
      JOIN public.channels ch ON ch.id = flow_sessions.channel_id
      WHERE f.id = flow_sessions.flow_id
        AND c.workspace_id = f.workspace_id
        AND ch.workspace_id = f.workspace_id
        AND public.is_workspace_member(f.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view conversations in their workspaces" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage conversations in their workspaces" ON public.conversations;
CREATE POLICY "Users can view consistent conversations in their workspaces"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.channels ch
      JOIN public.contacts c ON c.id = conversations.contact_id
      WHERE ch.id = conversations.channel_id
        AND conversations.workspace_id = ch.workspace_id
        AND conversations.workspace_id = c.workspace_id
        AND public.is_workspace_member(conversations.workspace_id)
    )
  );
CREATE POLICY "Users can manage consistent conversations in their workspaces"
  ON public.conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.channels ch
      JOIN public.contacts c ON c.id = conversations.contact_id
      WHERE ch.id = conversations.channel_id
        AND conversations.workspace_id = ch.workspace_id
        AND conversations.workspace_id = c.workspace_id
        AND public.is_workspace_member(conversations.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.channels ch
      JOIN public.contacts c ON c.id = conversations.contact_id
      WHERE ch.id = conversations.channel_id
        AND conversations.workspace_id = ch.workspace_id
        AND conversations.workspace_id = c.workspace_id
        AND public.is_workspace_member(conversations.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view messages via conversation" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages via conversation" ON public.messages;
CREATE POLICY "Users can view messages in one workspace"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations conv
      JOIN public.channels ch ON ch.id = conv.channel_id
      JOIN public.contacts c ON c.id = conv.contact_id
      LEFT JOIN public.flows f ON f.id = messages.sent_by_flow_id
      WHERE conv.id = messages.conversation_id
        AND conv.workspace_id = ch.workspace_id
        AND conv.workspace_id = c.workspace_id
        AND (messages.sent_by_flow_id IS NULL OR f.workspace_id = conv.workspace_id)
        AND public.is_workspace_member(conv.workspace_id)
    )
  );
CREATE POLICY "Users can insert messages in one workspace"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations conv
      JOIN public.channels ch ON ch.id = conv.channel_id
      JOIN public.contacts c ON c.id = conv.contact_id
      LEFT JOIN public.flows f ON f.id = messages.sent_by_flow_id
      WHERE conv.id = messages.conversation_id
        AND conv.workspace_id = ch.workspace_id
        AND conv.workspace_id = c.workspace_id
        AND (messages.sent_by_flow_id IS NULL OR f.workspace_id = conv.workspace_id)
        AND public.is_workspace_member(conv.workspace_id)
    )
  );

DROP POLICY IF EXISTS "enrollments_via_sequence" ON public.sequence_enrollments;
CREATE POLICY "enrollments_via_sequence_in_one_workspace"
  ON public.sequence_enrollments FOR ALL
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
  )
  WITH CHECK (
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

DROP POLICY IF EXISTS "Users can view broadcast recipients" ON public.broadcast_recipients;
DROP POLICY IF EXISTS "Users can insert broadcast recipients" ON public.broadcast_recipients;
DROP POLICY IF EXISTS "Users can update broadcast recipients" ON public.broadcast_recipients;
CREATE POLICY "Users can view broadcast recipients in one workspace"
  ON public.broadcast_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND public.is_workspace_member(b.workspace_id)
    )
  );
CREATE POLICY "Users can insert broadcast recipients in one workspace"
  ON public.broadcast_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND public.is_workspace_member(b.workspace_id)
    )
  );
CREATE POLICY "Users can update broadcast recipients in one workspace"
  ON public.broadcast_recipients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND public.is_workspace_member(b.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.contacts c ON c.id = broadcast_recipients.contact_id
      JOIN public.channels ch ON ch.id = broadcast_recipients.channel_id
      WHERE b.id = broadcast_recipients.broadcast_id
        AND b.workspace_id = c.workspace_id
        AND b.workspace_id = ch.workspace_id
        AND public.is_workspace_member(b.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can view analytics in their workspaces" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can insert analytics in their workspaces" ON public.analytics_events;
CREATE POLICY "Users can view analytics with consistent references"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces w
      LEFT JOIN public.flows f ON f.id = analytics_events.flow_id
      LEFT JOIN public.contacts c ON c.id = analytics_events.contact_id
      WHERE w.id = analytics_events.workspace_id
        AND (analytics_events.flow_id IS NULL OR f.workspace_id = w.id)
        AND (analytics_events.contact_id IS NULL OR c.workspace_id = w.id)
        AND public.is_workspace_member(w.id)
    )
  );
CREATE POLICY "Users can insert analytics with consistent references"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspaces w
      LEFT JOIN public.flows f ON f.id = analytics_events.flow_id
      LEFT JOIN public.contacts c ON c.id = analytics_events.contact_id
      WHERE w.id = analytics_events.workspace_id
        AND (analytics_events.flow_id IS NULL OR f.workspace_id = w.id)
        AND (analytics_events.contact_id IS NULL OR c.workspace_id = w.id)
        AND public.is_workspace_member(w.id)
    )
  );

DROP POLICY IF EXISTS "Users can view comment logs in their workspace" ON public.comment_logs;
CREATE POLICY "Users can view comment logs with consistent references"
  ON public.comment_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.channels ch
      LEFT JOIN public.triggers t ON t.id = comment_logs.matched_trigger_id
      LEFT JOIN public.flows f ON f.id = t.flow_id
      WHERE ch.id = comment_logs.channel_id
        AND ch.workspace_id = comment_logs.workspace_id
        AND (
          comment_logs.matched_trigger_id IS NULL
          OR f.workspace_id = comment_logs.workspace_id
        )
        AND public.is_workspace_member(comment_logs.workspace_id)
    )
  );
