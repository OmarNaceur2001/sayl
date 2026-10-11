-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- WORKSPACES
-- ============================================================
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  late_api_key_encrypted text,
  global_keywords jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index idx_workspace_members_user on workspace_members(user_id);

-- ============================================================
-- CHANNELS
-- ============================================================
create table channels (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'twitter', 'telegram', 'bluesky', 'reddit')),
  late_account_id text not null,
  username text,
  display_name text,
  profile_picture text,
  webhook_id text,
  webhook_secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, late_account_id)
);

create index idx_channels_workspace on channels(workspace_id);

-- ============================================================
-- CONTACTS (CRM)
-- ============================================================
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  is_subscribed boolean not null default true,
  last_interaction_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_workspace on contacts(workspace_id);
create index idx_contacts_last_interaction on contacts(workspace_id, last_interaction_at desc);

create table contact_channels (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  platform_sender_id text not null,
  platform_username text,
  created_at timestamptz not null default now(),
  unique (channel_id, platform_sender_id)
);

create index idx_contact_channels_contact on contact_channels(contact_id);

create table tags (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table contact_tags (
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table custom_field_definitions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null default 'text' check (type in ('text', 'number', 'boolean', 'date', 'url', 'email')),
  created_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table contact_custom_fields (
  contact_id uuid not null references contacts(id) on delete cascade,
  field_id uuid not null references custom_field_definitions(id) on delete cascade,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (contact_id, field_id)
);

-- ============================================================
-- FLOWS
-- ============================================================
create table flows (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  viewport jsonb,
  version integer not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_flows_workspace on flows(workspace_id);
create index idx_flows_status on flows(workspace_id, status);

create table triggers (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid not null references flows(id) on delete cascade,
  channel_id uuid references channels(id) on delete set null,
  type text not null check (type in ('keyword', 'postback', 'quick_reply', 'welcome', 'default', 'comment_keyword')),
  config jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_triggers_channel_type on triggers(channel_id, type, is_active);
create index idx_triggers_flow on triggers(flow_id);

create table flow_sessions (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  flow_id uuid not null references flows(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  current_node_id text,
  variables jsonb not null default '{}'::jsonb,
  flow_stack jsonb not null default '[]'::jsonb,
  waiting_until timestamptz,
  waiting_for_input boolean not null default false,
  human_takeover_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_flow_sessions_contact_active on flow_sessions(contact_id, channel_id) where status = 'active';

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  late_conversation_id text,
  platform text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'snoozed')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0,
  is_automation_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, contact_id)
);

create index idx_conversations_workspace on conversations(workspace_id, last_message_at desc);
create index idx_conversations_status on conversations(workspace_id, status);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  text text,
  attachments jsonb,
  quick_reply_payload text,
  postback_payload text,
  callback_data text,
  platform_message_id text,
  sent_by_flow_id uuid references flows(id) on delete set null,
  sent_by_node_id text,
  sent_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'sent' check (status in ('pending', 'sent', 'delivered', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);

-- ============================================================
-- BROADCASTS
-- ============================================================
create table broadcasts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'completed', 'cancelled')),
  message_content jsonb not null default '{}'::jsonb,
  segment_filter jsonb,
  scheduled_for timestamptz,
  total_recipients integer not null default 0,
  sent integer not null default 0,
  delivered integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_broadcasts_workspace on broadcasts(workspace_id);

create table broadcast_recipients (
  id uuid primary key default uuid_generate_v4(),
  broadcast_id uuid not null references broadcasts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  channel_id uuid not null references channels(id) on delete cascade,
  status text not null default 'pending',
  sent_at timestamptz,
  error_message text
);

create index idx_broadcast_recipients_broadcast on broadcast_recipients(broadcast_id, status);

-- ============================================================
-- JOBS & ANALYTICS
-- ============================================================
create table scheduled_jobs (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create index idx_scheduled_jobs_pending on scheduled_jobs(run_at) where status = 'pending';

create table analytics_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  flow_id uuid references flows(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_workspace on analytics_events(workspace_id, created_at desc);
create index idx_analytics_flow on analytics_events(flow_id, created_at desc);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on workspaces for each row execute function update_updated_at();
create trigger set_updated_at before update on channels for each row execute function update_updated_at();
create trigger set_updated_at before update on contacts for each row execute function update_updated_at();
create trigger set_updated_at before update on flows for each row execute function update_updated_at();
create trigger set_updated_at before update on flow_sessions for each row execute function update_updated_at();
create trigger set_updated_at before update on conversations for each row execute function update_updated_at();
create trigger set_updated_at before update on broadcasts for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE WORKSPACE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  ws_id uuid;
  user_name text;
  workspace_slug text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  workspace_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug)
  values (user_name || '''s Workspace', workspace_slug)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
exception when others then
  raise log 'handle_new_user error: % %', sqlerrm, sqlstate;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================
-- All tables are filtered by workspace_id.
-- Users can only access rows in workspaces they belong to.
-- Service role key bypasses RLS (used in webhook handler).
-- ============================================================

-- Helper function: check if user belongs to workspace
create or replace function is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- WORKSPACES
-- ============================================================
alter table workspaces enable row level security;

create policy "Users can view their workspaces"
  on workspaces for select
  using (is_workspace_member(id));

create policy "Users can update their workspaces"
  on workspaces for update
  using (is_workspace_member(id));

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
alter table workspace_members enable row level security;

-- SELECT uses direct user_id check to avoid infinite recursion
-- (is_workspace_member queries workspace_members, which would trigger RLS again)
create policy "Members can view their workspace memberships"
  on workspace_members for select
  using (user_id = auth.uid());

create policy "Owners can insert members"
  on workspace_members for insert
  with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

create policy "Owners can update members"
  on workspace_members for update
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

create policy "Owners can delete members"
  on workspace_members for delete
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- ============================================================
-- CHANNELS
-- ============================================================
alter table channels enable row level security;

create policy "Users can view channels in their workspaces"
  on channels for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage channels in their workspaces"
  on channels for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- CONTACTS
-- ============================================================
alter table contacts enable row level security;

create policy "Users can view contacts in their workspaces"
  on contacts for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage contacts in their workspaces"
  on contacts for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- CONTACT CHANNELS
-- ============================================================
alter table contact_channels enable row level security;

create policy "Users can view contact channels via contact"
  on contact_channels for select
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_channels.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

create policy "Users can manage contact channels"
  on contact_channels for all
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_channels.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

-- ============================================================
-- TAGS
-- ============================================================
alter table tags enable row level security;

create policy "Users can view tags in their workspaces"
  on tags for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage tags in their workspaces"
  on tags for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- CONTACT TAGS
-- ============================================================
alter table contact_tags enable row level security;

create policy "Users can view contact tags"
  on contact_tags for select
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_tags.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

create policy "Users can manage contact tags"
  on contact_tags for all
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_tags.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

-- ============================================================
-- CUSTOM FIELD DEFINITIONS
-- ============================================================
alter table custom_field_definitions enable row level security;

create policy "Users can view custom fields in their workspaces"
  on custom_field_definitions for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage custom fields in their workspaces"
  on custom_field_definitions for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- CONTACT CUSTOM FIELDS
-- ============================================================
alter table contact_custom_fields enable row level security;

create policy "Users can view contact custom fields"
  on contact_custom_fields for select
  using (
    exists (
      select 1 from contacts c
      join contact_custom_fields ccf on ccf.contact_id = c.id
      where c.id = contact_custom_fields.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

create policy "Users can manage contact custom fields"
  on contact_custom_fields for all
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_custom_fields.contact_id
        and is_workspace_member(c.workspace_id)
    )
  );

-- ============================================================
-- FLOWS
-- ============================================================
alter table flows enable row level security;

create policy "Users can view flows in their workspaces"
  on flows for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage flows in their workspaces"
  on flows for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- TRIGGERS
-- ============================================================
alter table triggers enable row level security;

create policy "Users can view triggers via flow"
  on triggers for select
  using (
    exists (
      select 1 from flows f
      where f.id = triggers.flow_id
        and is_workspace_member(f.workspace_id)
    )
  );

create policy "Users can manage triggers via flow"
  on triggers for all
  using (
    exists (
      select 1 from flows f
      where f.id = triggers.flow_id
        and is_workspace_member(f.workspace_id)
    )
  );

-- ============================================================
-- FLOW SESSIONS
-- ============================================================
alter table flow_sessions enable row level security;

create policy "Users can view flow sessions via flow"
  on flow_sessions for select
  using (
    exists (
      select 1 from flows f
      where f.id = flow_sessions.flow_id
        and is_workspace_member(f.workspace_id)
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
alter table conversations enable row level security;

create policy "Users can view conversations in their workspaces"
  on conversations for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage conversations in their workspaces"
  on conversations for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- MESSAGES
-- ============================================================
alter table messages enable row level security;

create policy "Users can view messages via conversation"
  on messages for select
  using (
    exists (
      select 1 from conversations conv
      where conv.id = messages.conversation_id
        and is_workspace_member(conv.workspace_id)
    )
  );

create policy "Users can insert messages via conversation"
  on messages for insert
  with check (
    exists (
      select 1 from conversations conv
      where conv.id = messages.conversation_id
        and is_workspace_member(conv.workspace_id)
    )
  );

-- ============================================================
-- BROADCASTS
-- ============================================================
alter table broadcasts enable row level security;

create policy "Users can view broadcasts in their workspaces"
  on broadcasts for select
  using (is_workspace_member(workspace_id));

create policy "Users can manage broadcasts in their workspaces"
  on broadcasts for all
  using (is_workspace_member(workspace_id));

-- ============================================================
-- BROADCAST RECIPIENTS
-- ============================================================
alter table broadcast_recipients enable row level security;

create policy "Users can view broadcast recipients"
  on broadcast_recipients for select
  using (
    exists (
      select 1 from broadcasts b
      where b.id = broadcast_recipients.broadcast_id
        and is_workspace_member(b.workspace_id)
    )
  );

-- ============================================================
-- SCHEDULED JOBS (service role only, no user RLS needed)
-- ============================================================
alter table scheduled_jobs enable row level security;

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
alter table analytics_events enable row level security;

create policy "Users can view analytics in their workspaces"
  on analytics_events for select
  using (is_workspace_member(workspace_id));

create policy "Users can insert analytics in their workspaces"
  on analytics_events for insert
  with check (is_workspace_member(workspace_id));

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Increment unread count and update conversation preview
create or replace function increment_unread(conv_id uuid, preview text)
returns void as $$
begin
  update conversations
  set unread_count = unread_count + 1,
      last_message_at = now(),
      last_message_preview = preview,
      status = 'open'
  where id = conv_id;
end;
$$ language plpgsql security definer;

-- Increment broadcast sent counter
create or replace function increment_broadcast_sent(b_id uuid)
returns void as $$
begin
  update broadcasts
  set sent = sent + 1,
      delivered = delivered + 1
  where id = b_id;
end;
$$ language plpgsql security definer;

-- Increment broadcast failed counter
create or replace function increment_broadcast_failed(b_id uuid)
returns void as $$
begin
  update broadcasts
  set failed = failed + 1
  where id = b_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- COMMENT AUTOMATION
-- ============================================================

-- Add comment polling cursor to channels
alter table channels
  add column if not exists last_comment_cursor text,
  add column if not exists comment_rules jsonb default '[]'::jsonb;

-- Comment processing log
create table if not exists comment_logs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  post_id text, -- Late post ID the comment belongs to
  platform_comment_id text not null,
  author_id text,
  author_name text,
  author_username text,
  comment_text text not null,
  matched_trigger_id uuid references triggers(id) on delete set null,
  dm_sent boolean not null default false,
  reply_sent boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

-- Indexes for efficient lookups
create index if not exists idx_comment_logs_channel_id on comment_logs(channel_id);
create index if not exists idx_comment_logs_workspace_id on comment_logs(workspace_id);
create index if not exists idx_comment_logs_platform_comment_id on comment_logs(platform_comment_id);
create index if not exists idx_comment_logs_created_at on comment_logs(created_at desc);

-- Unique constraint to avoid processing the same comment twice
create unique index if not exists idx_comment_logs_unique_comment
  on comment_logs(channel_id, platform_comment_id);

-- RLS policies for comment_logs
alter table comment_logs enable row level security;

create policy "Users can view comment logs in their workspace"
  on comment_logs for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Sequences: drip campaigns
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequences_workspace" ON sequences
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id),
  current_step_index INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(sequence_id, contact_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_via_sequence" ON sequence_enrollments
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM sequences WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- WORKSPACE INVITES
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Members of the workspace can view invites
CREATE POLICY "workspace_invites_select" ON workspace_invites
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Only workspace owners can create invites
CREATE POLICY "workspace_invites_insert" ON workspace_invites
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only workspace owners can delete invites
CREATE POLICY "workspace_invites_delete" ON workspace_invites
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only workspace owners can update invite status
CREATE POLICY "workspace_invites_update" ON workspace_invites
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR
    -- Allow the invited user to accept their own invite
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add OpenAI API key column to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- Rename openai_api_key to ai_api_key and add ai_provider column
ALTER TABLE workspaces RENAME COLUMN openai_api_key TO ai_api_key;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'openai';

-- Fix broadcast_recipients: add INSERT/UPDATE/DELETE policies
CREATE POLICY "Users can insert broadcast recipients" ON broadcast_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id
        AND is_workspace_member(b.workspace_id)
    )
  );

CREATE POLICY "Users can update broadcast recipients" ON broadcast_recipients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id
        AND is_workspace_member(b.workspace_id)
    )
  );

-- scheduled_jobs is system-level; keep access restricted to service-role code.

-- Flow version history: stores a snapshot of nodes/edges on each publish
create table flow_versions (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid not null references flows(id) on delete cascade,
  version integer not null,
  nodes jsonb not null,
  edges jsonb not null,
  viewport jsonb,
  name text not null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (flow_id, version)
);

create index idx_flow_versions_flow on flow_versions(flow_id, version desc);

-- RLS
alter table flow_versions enable row level security;

create policy "flow_versions_select" on flow_versions for select
  using (exists (
    select 1 from flows f
    join workspace_members wm on wm.workspace_id = f.workspace_id
    where f.id = flow_versions.flow_id
      and wm.user_id = auth.uid()
  ));

create policy "flow_versions_insert" on flow_versions for insert
  with check (exists (
    select 1 from flows f
    join workspace_members wm on wm.workspace_id = f.workspace_id
    where f.id = flow_versions.flow_id
      and wm.user_id = auth.uid()
  ));

-- Add workspace-level webhook secret for Zernio HMAC signature verification.
-- Zernio exposes a single webhook per profile/API key, so the secret lives at the
-- workspace level (not per-channel). Used by /api/webhooks/late to verify signatures.
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Idempotency ledger for inbound Zernio webhook deliveries. Zernio retries a
-- delivery with the same event id whenever our 200 doesn't arrive within its 5s
-- timeout; /api/webhooks/late claims the id here before processing so retries
-- and redeliveries never re-run a flow (which was double-sending DMs).
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rows are only needed for the retry window (hours); allow cheap pruning.
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events (received_at);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- sequence_enrollments.channel_id was declared without an ON DELETE action
-- (00005_sequences.sql), so deleting a channel with enrollments failed with a
-- 23503 FK violation. Every other channel FK cascades (or sets null); align
-- this one so channel deletion works.
ALTER TABLE sequence_enrollments
  DROP CONSTRAINT sequence_enrollments_channel_id_fkey,
  ADD CONSTRAINT sequence_enrollments_channel_id_fkey
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

-- The cron claims a job by flipping status to 'processing'. If that UPDATE
-- commits but the response is lost, the job is stranded: the fetch only read
-- 'pending' rows. claimed_at lets the cron reclaim 'processing' jobs whose
-- claim is older than a few minutes.
ALTER TABLE scheduled_jobs ADD COLUMN claimed_at timestamptz;

CREATE INDEX idx_scheduled_jobs_processing ON scheduled_jobs(claimed_at)
  WHERE status = 'processing';

-- 00014 added claimed_at but did not backfill rows already stuck in
-- 'processing', and old-code invocations claim without stamping it. Stamp
-- existing NULL claims so the cron's staleness clock (claimed_at older than
-- 5 minutes) applies to them; genuinely stranded rows become reclaimable
-- shortly after this runs, while a claim still live at migration time gets
-- the full window to finish before being reclaimed.
UPDATE scheduled_jobs
SET claimed_at = now()
WHERE status = 'processing' AND claimed_at IS NULL;

-- WhatsApp was advertised on the site, offered in the channel picker and
-- already handled by the flow engine, but 00001's platform check constraint
-- never listed it, so the channel row could not be stored (issue #16).
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_platform_check;

ALTER TABLE channels ADD CONSTRAINT channels_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'twitter', 'telegram', 'bluesky', 'reddit', 'whatsapp'));

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

ALTER TABLE public.contacts
  ADD COLUMN language text
    CHECK (language IN ('fr', 'en', 'ar', 'tn')),
  ADD COLUMN language_confidence numeric
    CHECK (language_confidence IS NULL OR language_confidence BETWEEN 0 AND 1),
  ADD COLUMN language_source text
    CHECK (language_source IN ('detected', 'manual', 'default'));

ALTER TABLE public.conversations
  ADD COLUMN language text
    CHECK (language IN ('fr', 'en', 'ar', 'tn'));

ALTER TABLE public.workspaces
  ADD COLUMN default_language text NOT NULL DEFAULT 'fr'
    CHECK (default_language IN ('fr', 'en', 'ar', 'tn')),
  ADD COLUMN enabled_languages text[] NOT NULL
    DEFAULT ARRAY['fr', 'en', 'ar', 'tn']::text[]
    CHECK (
      cardinality(enabled_languages) > 0
      AND enabled_languages <@ ARRAY['fr', 'en', 'ar', 'tn']::text[]
    );


-- Stage 2: AI knowledge base (pgvector) + AI usage/cost log.
-- Embeddings: openai/text-embedding-3-small (1536 dimensions).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('faq', 'text', 'csv')),
  language text CHECK (language IS NULL OR language IN ('fr', 'en', 'ar', 'tn')),
  chunk_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  embedding extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- a chunk can only point to a document of the SAME workspace
  FOREIGN KEY (document_id, workspace_id)
    REFERENCES public.kb_documents (id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_documents_workspace ON public.kb_documents (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_workspace ON public.kb_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON public.kb_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding
  ON public.kb_chunks USING hnsw (embedding extensions.vector_cosine_ops);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kb documents"
  ON public.kb_documents FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Owners and admins can insert kb documents"
  ON public.kb_documents FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can update kb documents"
  ON public.kb_documents FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can delete kb documents"
  ON public.kb_documents FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_documents.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));

CREATE POLICY "Members can view kb chunks"
  ON public.kb_chunks FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Owners and admins can insert kb chunks"
  ON public.kb_chunks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_chunks.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can delete kb chunks"
  ON public.kb_chunks FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = kb_chunks.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')));

-- Retrieval is called by the flow engine with the service role only.
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  p_workspace_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer DEFAULT 4,
  p_min_similarity double precision DEFAULT 0
)
RETURNS TABLE (id uuid, document_id uuid, content text, similarity double precision)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.id, c.document_id, c.content,
         1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.kb_chunks c
  WHERE c.workspace_id = p_workspace_id
    AND 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 20);
$$;

REVOKE ALL ON FUNCTION public.match_kb_chunks(uuid, extensions.vector, integer, double precision)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_kb_chunks(uuid, extensions.vector, integer, double precision)
  TO service_role;

-- ============================================================
-- AI USAGE LOG (one row per AI call; written by the service role only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('ai_response', 'embedding')),
  model text,
  language text CHECK (language IS NULL OR language IN ('fr', 'en', 'ar', 'tn')),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'handover', 'failed')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_created
  ON public.usage_events (workspace_id, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view usage events"
  ON public.usage_events FOR SELECT USING (is_workspace_member(workspace_id));

REVOKE ALL ON TABLE public.usage_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.usage_events TO authenticated;
GRANT ALL ON TABLE public.usage_events TO service_role;
