alter table users enable row level security;
alter table family_groups enable row level security;
alter table family_group_members enable row level security;
alter table guest_profiles enable row level security;
alter table family_invitations enable row level security;
alter table trips enable row level security;
alter table trip_destinations enable row level security;
alter table trip_participants enable row level security;
alter table trip_days enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table event_documents enable row level security;
alter table trip_tasks enable row level security;
alter table in_the_bag_items enable row level security;
alter table subscriptions enable row level security;
alter table async_jobs enable row level security;
alter table feature_flags enable row level security;
alter table event_categories enable row level security;
alter table event_subcategories enable row level security;
alter table milestone_banner_states enable row level security;

create policy "users: own row only" on users for all using (id = auth.uid()) with check (id = auth.uid());

create policy "family_groups: members can read" on family_groups for select using (id in (select family_group_id from family_group_members where user_id = auth.uid()));
create policy "family_groups: owner can insert/update/delete" on family_groups for all using (created_by_user_id = auth.uid()) with check (created_by_user_id = auth.uid());

-- NOTE: family_group_members INSERT is owner-only. Invitation acceptance MUST use a
-- security definer RPC `accept_family_invitation(token uuid)` — not a direct client INSERT.
create policy "family_group_members: members of same group can read" on family_group_members for select using (family_group_id in (select family_group_id from family_group_members where user_id = auth.uid()));
create policy "family_group_members: group owner can manage" on family_group_members for all using (family_group_id in (select id from family_groups where created_by_user_id = auth.uid())) with check (family_group_id in (select id from family_groups where created_by_user_id = auth.uid()));

create policy "guest_profiles: managing user only" on guest_profiles for all using (managed_by_user_id = auth.uid()) with check (managed_by_user_id = auth.uid());

create policy "family_invitations: inviter can manage" on family_invitations for all using (inviter_user_id = auth.uid()) with check (inviter_user_id = auth.uid());
create policy "family_invitations: invitee can read by token" on family_invitations for select using (invitee_email = (select email from users where id = auth.uid()));

create policy "trips: participants can read" on trips for select using (id in (select trip_id from trip_participants where user_id = auth.uid()) or owner_user_id = auth.uid());
create policy "trips: owner can insert/update/delete" on trips for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "trip_destinations: trip participants can read" on trip_destinations for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "trip_destinations: trip owner can manage" on trip_destinations for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "trip_participants: participants can read" on trip_participants for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "trip_participants: trip owner can manage" on trip_participants for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "trip_days: participants can read" on trip_days for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "trip_days: trip owner can manage" on trip_days for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "events: trip participants can read" on events for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "events: trip owner can manage" on events for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "event_participants: trip participants can read" on event_participants for select using (event_id in (select id from events where trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid())));
create policy "event_participants: trip owner can manage" on event_participants for all using (event_id in (select id from events where trip_id in (select id from trips where owner_user_id = auth.uid()))) with check (event_id in (select id from events where trip_id in (select id from trips where owner_user_id = auth.uid())));

create policy "event_documents: trip participants can read" on event_documents for select using (event_id in (select id from events where trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid())));
create policy "event_documents: trip owner can manage" on event_documents for all using (event_id in (select id from events where trip_id in (select id from trips where owner_user_id = auth.uid()))) with check (event_id in (select id from events where trip_id in (select id from trips where owner_user_id = auth.uid())));

create policy "trip_tasks: trip participants can read" on trip_tasks for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "trip_tasks: trip owner can manage" on trip_tasks for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "in_the_bag_items: trip participants can read" on in_the_bag_items for select using (trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
create policy "in_the_bag_items: trip participants can insert" on in_the_bag_items for insert with check (((event_id is not null and trip_day_id is null) or (trip_day_id is not null and event_id is null) or (trip_day_id is null and event_id is null)) and exists (select 1 from trip_participants tp where tp.trip_id = in_the_bag_items.trip_id and tp.user_id = auth.uid()));
create policy "in_the_bag_items: trip owner can manage" on in_the_bag_items for all using (trip_id in (select id from trips where owner_user_id = auth.uid())) with check (trip_id in (select id from trips where owner_user_id = auth.uid()));

create policy "subscriptions: own row only" on subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "async_jobs: own jobs only" on async_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "feature_flags: authenticated read" on feature_flags for select using (auth.role() = 'authenticated');
create policy "event_categories: authenticated read" on event_categories for select using (auth.role() = 'authenticated');
create policy "event_subcategories: authenticated read" on event_subcategories for select using (auth.role() = 'authenticated');
create policy "milestone_banner_states: own rows per trip" on milestone_banner_states for all using (user_id = auth.uid() and trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid())) with check (user_id = auth.uid() and trip_id in (select trip_id from trip_participants where user_id = auth.uid() union select id from trips where owner_user_id = auth.uid()));
