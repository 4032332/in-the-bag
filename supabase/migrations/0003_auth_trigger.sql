create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_group_id uuid;
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.family_groups (name, created_by_user_id) values (new.email || '''s Family', new.id) returning id into new_group_id;
  insert into public.family_group_members (family_group_id, user_id, role) values (new_group_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
