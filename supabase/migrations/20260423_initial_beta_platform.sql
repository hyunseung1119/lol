create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  riot_game_name text,
  riot_tag_line text,
  default_persona text not null default 'general' check (default_persona in ('general', 'pro', 'veteran', 'new', 'coach', 'director')),
  favorite_roles text[] not null default '{}'::text[],
  beta_status text not null default 'waitlist' check (beta_status in ('waitlist', 'approved', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role_focus text,
  use_case text,
  referred_by text,
  source text not null default 'landing',
  consent_marketing boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  plan_tier text not null default 'beta' check (plan_tier in ('free', 'beta', 'coach', 'team')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'player' check (member_role in ('owner', 'coach', 'analyst', 'player', 'manager')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table if not exists public.draft_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  series_mode text not null default 'bo1' check (series_mode in ('bo1', 'bo3', 'bo5', 'fearless')),
  patch text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draft_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  series_id uuid references public.draft_series(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  queue_type text not null default 'tournament' check (queue_type in ('tournament', 'ranked', 'scrim')),
  patch text not null,
  persona_mode text not null default 'general' check (persona_mode in ('general', 'pro', 'veteran', 'new', 'coach', 'director')),
  side_to_act text not null default 'blue' check (side_to_act in ('blue', 'red')),
  action_type text not null default 'pick' check (action_type in ('pick', 'ban')),
  status text not null default 'drafting' check (status in ('drafting', 'locked', 'archived')),
  is_public_share boolean not null default false,
  share_token uuid not null default gen_random_uuid() unique,
  blue_bans jsonb not null default '[]'::jsonb,
  red_bans jsonb not null default '[]'::jsonb,
  blue_picks jsonb not null default '[]'::jsonb,
  red_picks jsonb not null default '[]'::jsonb,
  preferred_champions text[] not null default '{}'::text[],
  blue_estimated_win_rate numeric(5,2),
  red_estimated_win_rate numeric(5,2),
  confidence numeric(5,2),
  explanation text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draft_room_members (
  room_id uuid not null references public.draft_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_role text not null default 'observer' check (room_role in ('blue', 'red', 'observer', 'coach')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.draft_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.draft_rooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('pick', 'ban', 'undo', 'reset', 'analysis', 'message')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.champion_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  champion_id text not null,
  preferred_role text,
  priority smallint not null default 1 check (priority between 1 and 5),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, champion_id)
);

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.draft_rooms(id) on delete set null,
  category text not null check (category in ('bug', 'model_quality', 'riot_policy', 'feature_request', 'beta_access')),
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'triaged', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_draft_rooms_org_id on public.draft_rooms(organization_id);
create index if not exists idx_draft_rooms_series_id on public.draft_rooms(series_id);
create index if not exists idx_draft_rooms_created_by on public.draft_rooms(created_by);
create index if not exists idx_draft_events_room_id on public.draft_events(room_id);
create index if not exists idx_draft_events_created_at on public.draft_events(created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_draft_series_updated_at
before update on public.draft_series
for each row execute function public.set_updated_at();

create trigger set_draft_rooms_updated_at
before update on public.draft_rooms
for each row execute function public.set_updated_at();

create trigger set_champion_preferences_updated_at
before update on public.champion_preferences
for each row execute function public.set_updated_at();

create trigger set_feedback_reports_updated_at
before update on public.feedback_reports
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_room(target_room_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.draft_rooms dr
    where dr.id = target_room_id
      and (
        dr.created_by = auth.uid()
        or dr.is_public_share = true
        or (dr.organization_id is not null and public.is_org_member(dr.organization_id))
        or exists (
          select 1
          from public.draft_room_members drm
          where drm.room_id = dr.id
            and drm.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.beta_waitlist enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.draft_series enable row level security;
alter table public.draft_rooms enable row level security;
alter table public.draft_room_members enable row level security;
alter table public.draft_events enable row level security;
alter table public.champion_preferences enable row level security;
alter table public.feedback_reports enable row level security;

create policy "profiles select own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles insert own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles update own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "beta waitlist insert"
on public.beta_waitlist for insert
to anon, authenticated
with check (true);

create policy "organizations select by membership"
on public.organizations for select
to authenticated
using (owner_id = auth.uid() or public.is_org_member(id));

create policy "organizations insert own"
on public.organizations for insert
to authenticated
with check (owner_id = auth.uid());

create policy "organizations update owner"
on public.organizations for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "organization_members select by membership"
on public.organization_members for select
to authenticated
using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy "organization_members insert owner"
on public.organization_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.organizations o
    where o.id = organization_id
      and o.owner_id = auth.uid()
  )
);

create policy "organization_members delete owner"
on public.organization_members for delete
to authenticated
using (
  exists (
    select 1
    from public.organizations o
    where o.id = organization_id
      and o.owner_id = auth.uid()
  )
);

create policy "draft_series select"
on public.draft_series for select
to authenticated
using (
  created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
);

create policy "draft_series insert"
on public.draft_series for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    organization_id is null
    or public.is_org_member(organization_id)
  )
);

create policy "draft_series update"
on public.draft_series for update
to authenticated
using (
  created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
)
with check (
  created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
);

create policy "draft_rooms select"
on public.draft_rooms for select
to anon, authenticated
using (
  is_public_share = true
  or created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
  or exists (
    select 1
    from public.draft_room_members drm
    where drm.room_id = id
      and drm.user_id = auth.uid()
  )
);

create policy "draft_rooms insert"
on public.draft_rooms for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    organization_id is null
    or public.is_org_member(organization_id)
  )
);

create policy "draft_rooms update"
on public.draft_rooms for update
to authenticated
using (
  created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
)
with check (
  created_by = auth.uid()
  or (organization_id is not null and public.is_org_member(organization_id))
);

create policy "draft_room_members select"
on public.draft_room_members for select
to authenticated
using (public.can_access_room(room_id));

create policy "draft_room_members insert"
on public.draft_room_members for insert
to authenticated
with check (public.can_access_room(room_id));

create policy "draft_events select"
on public.draft_events for select
to authenticated
using (public.can_access_room(room_id));

create policy "draft_events insert"
on public.draft_events for insert
to authenticated
with check (
  public.can_access_room(room_id)
  and (actor_id is null or actor_id = auth.uid())
);

create policy "champion_preferences select own"
on public.champion_preferences for select
to authenticated
using (user_id = auth.uid());

create policy "champion_preferences insert own"
on public.champion_preferences for insert
to authenticated
with check (user_id = auth.uid());

create policy "champion_preferences update own"
on public.champion_preferences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "champion_preferences delete own"
on public.champion_preferences for delete
to authenticated
using (user_id = auth.uid());

create policy "feedback_reports select own"
on public.feedback_reports for select
to authenticated
using (user_id = auth.uid());

create policy "feedback_reports insert own"
on public.feedback_reports for insert
to authenticated
with check (user_id = auth.uid());

create policy "feedback_reports update own"
on public.feedback_reports for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
