
create type public.app_role as enum ('admin','gerente','colaborador');
create type public.entry_status as enum ('pending','approved','rejected');
create type public.goal_scope as enum ('global','team','user');
create type public.task_priority as enum ('baixa','media','alta');
create type public.task_status as enum ('aberta','concluida');
create type public.points_source as enum ('kpi','goal_bonus','achievement','adjustment');

create or replace function public.sp_today() returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create table public.app_settings (
  id boolean primary key default true check (id),
  workspace_name text not null default 'Norte',
  daily_goal_bonus integer not null default 10 check (daily_goal_bonus >= 0),
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;
grant select, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#12805C',
  manager_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  matricula text not null unique,
  team_id uuid references public.teams(id) on delete set null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teams add constraint teams_manager_fk foreign key (manager_id) references public.profiles(id) on delete set null;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  unit text not null default 'un',
  points_per_unit integer not null default 1 check (points_per_unit >= 0),
  default_daily_goal integer not null default 0 check (default_daily_goal >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, update on public.kpi_definitions to authenticated;
grant all on public.kpi_definitions to service_role;
alter table public.kpi_definitions enable row level security;
insert into public.kpi_definitions (key, name, description, default_daily_goal, sort_order) values
  ('OFEX','OFEX','Ofertas exclusivas realizadas',6,1),
  ('APOIO','APOIO','Atendimentos de apoio',4,2),
  ('SORRIA','SORRIA','Indicador SORRIA',3,3),
  ('CADASTRO','CADASTRO','Novos cadastros de clientes',5,4);

create table public.kpi_goals (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  scope public.goal_scope not null,
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  daily_goal integer not null check (daily_goal >= 0),
  created_at timestamptz not null default now(),
  check ((scope='global' and team_id is null and user_id is null)
      or (scope='team' and team_id is not null and user_id is null)
      or (scope='user' and user_id is not null and team_id is null))
);
create unique index kpi_goals_unique on public.kpi_goals (kpi_id, scope, coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(user_id,'00000000-0000-0000-0000-000000000000'::uuid));
grant select, insert, update, delete on public.kpi_goals to authenticated;
grant all on public.kpi_goals to service_role;
alter table public.kpi_goals enable row level security;

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  status public.entry_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index daily_entries_status_idx on public.daily_entries (status, entry_date);
grant select on public.daily_entries to authenticated;
grant all on public.daily_entries to service_role;
alter table public.daily_entries enable row level security;

create table public.daily_entry_values (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.daily_entries(id) on delete cascade,
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  value integer not null check (value >= 0),
  original_value integer check (original_value >= 0),
  unique (entry_id, kpi_id)
);
grant select on public.daily_entry_values to authenticated;
grant all on public.daily_entry_values to service_role;
alter table public.daily_entry_values enable row level security;

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type public.points_source not null,
  source_id uuid,
  points integer not null,
  description text not null default '',
  ref_date date not null,
  created_at timestamptz not null default now()
);
create index points_ledger_user_date on public.points_ledger (user_id, ref_date);
create index points_ledger_date on public.points_ledger (ref_date);
grant select on public.points_ledger to authenticated;
grant all on public.points_ledger to service_role;
alter table public.points_ledger enable row level security;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  due_date date,
  due_time time,
  priority public.task_priority not null default 'media',
  category text,
  status public.task_status not null default 'aberta',
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assigned_idx on public.tasks (assigned_to, status, due_date);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  team_id uuid references public.teams(id) on delete cascade,
  pinned boolean not null default false,
  expires_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.manages_user(_manager uuid, _target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_manager, 'admin') or (
    public.has_role(_manager, 'gerente') and exists (
      select 1 from public.profiles p join public.teams t on t.id = p.team_id
      where p.id = _target and t.manager_id = _manager))
$$;

create or replace function public.manages_team(_uid uuid, _team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_uid, 'admin') or (
    public.has_role(_uid, 'gerente') and exists (select 1 from public.teams where id = _team and manager_id = _uid))
$$;

create or replace function public.my_team_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create or replace function public.expected_days(_start date, _end date)
returns integer language sql immutable set search_path = public as $$
  select count(*)::int from generate_series(_start, _end, interval '1 day') d where extract(isodow from d) <> 7
$$;

create or replace function public.daily_goal_for(_user uuid, _kpi uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select daily_goal from public.kpi_goals where kpi_id = _kpi and scope = 'user' and user_id = _user limit 1),
    (select g.daily_goal from public.kpi_goals g join public.profiles p on p.team_id = g.team_id
       where g.kpi_id = _kpi and g.scope = 'team' and p.id = _user limit 1),
    (select daily_goal from public.kpi_goals where kpi_id = _kpi and scope = 'global' limit 1),
    (select default_daily_goal from public.kpi_definitions where id = _kpi),
    0)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, matricula)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'matricula', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    if new.team_id is distinct from old.team_id or new.matricula is distinct from old.matricula
       or new.is_active is distinct from old.is_active or new.id <> old.id then
      raise exception 'Apenas administradores podem alterar equipe, matrícula ou status.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.tasks_before()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.team_id is null then
      select team_id into new.team_id from public.profiles where id = new.assigned_to;
    end if;
  end if;
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status <> 'concluida') then
    new.completed_at := now();
  elsif new.status = 'aberta' then
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger tasks_before before insert or update on public.tasks
  for each row execute function public.tasks_before();

create or replace function public.tasks_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is distinct from new.created_by
     and (tg_op = 'INSERT' or old.assigned_to is distinct from new.assigned_to) then
    insert into public.notifications (user_id, title, body, link)
    values (new.assigned_to, 'Nova tarefa atribuída', new.title, '/agenda');
  end if;
  return new;
end $$;
create trigger tasks_notify after insert or update of assigned_to on public.tasks
  for each row execute function public.tasks_notify();

create policy "settings read" on public.app_settings for select to authenticated using (true);
create policy "settings admin update" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "teams read" on public.teams for select to authenticated using (true);
create policy "teams admin insert" on public.teams for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "teams admin update" on public.teams for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "teams admin delete" on public.teams for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "profiles read" on public.profiles for select to authenticated using (
  id = auth.uid() or (team_id is not null and team_id = public.my_team_id()) or public.manages_user(auth.uid(), id));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "roles read" on public.user_roles for select to authenticated using (
  user_id = auth.uid() or public.manages_user(auth.uid(), user_id));

create policy "kpi read" on public.kpi_definitions for select to authenticated using (true);
create policy "kpi admin update" on public.kpi_definitions for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "goals read" on public.kpi_goals for select to authenticated using (true);
create policy "goals admin insert" on public.kpi_goals for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "goals admin update" on public.kpi_goals for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "goals admin delete" on public.kpi_goals for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "entries read" on public.daily_entries for select to authenticated using (
  user_id = auth.uid() or public.manages_user(auth.uid(), user_id));
create policy "entry values read" on public.daily_entry_values for select to authenticated using (
  exists (select 1 from public.daily_entries e where e.id = entry_id
          and (e.user_id = auth.uid() or public.manages_user(auth.uid(), e.user_id))));

create policy "ledger read" on public.points_ledger for select to authenticated using (
  user_id = auth.uid() or public.manages_user(auth.uid(), user_id));

create policy "tasks read" on public.tasks for select to authenticated using (
  assigned_to = auth.uid() or created_by = auth.uid() or public.manages_user(auth.uid(), assigned_to));
create policy "tasks insert" on public.tasks for insert to authenticated with check (
  created_by = auth.uid() and (assigned_to = auth.uid() or public.manages_user(auth.uid(), assigned_to)));
create policy "tasks update" on public.tasks for update to authenticated
  using (assigned_to = auth.uid() or created_by = auth.uid() or public.manages_user(auth.uid(), assigned_to))
  with check (assigned_to = auth.uid() or public.manages_user(auth.uid(), assigned_to));
create policy "tasks delete" on public.tasks for delete to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "events read" on public.events for select to authenticated using (
  owner_id = auth.uid() or (team_id is not null and (team_id = public.my_team_id() or public.manages_team(auth.uid(), team_id))));
create policy "events insert" on public.events for insert to authenticated with check (
  owner_id = auth.uid() and (team_id is null or public.manages_team(auth.uid(), team_id)));
create policy "events update" on public.events for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (team_id is null or public.manages_team(auth.uid(), team_id));
create policy "events delete" on public.events for delete to authenticated using (
  owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "ann read" on public.announcements for select to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(),'admin') or
  ((team_id is null or team_id = public.my_team_id() or public.manages_team(auth.uid(), team_id))
    and (expires_at is null or expires_at > now())));
create policy "ann insert" on public.announcements for insert to authenticated with check (
  created_by = auth.uid() and ((team_id is null and public.has_role(auth.uid(),'admin'))
    or (team_id is not null and public.manages_team(auth.uid(), team_id))));
create policy "ann update" on public.announcements for update to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check ((team_id is null and public.has_role(auth.uid(),'admin')) or (team_id is not null and public.manages_team(auth.uid(), team_id)));
create policy "ann delete" on public.announcements for delete to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "notif read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.submit_daily_entry(_date date, _values jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _entry public.daily_entries;
  _id uuid; _k record; _v integer; _name text; _mgr uuid;
begin
  if _uid is null then raise exception 'Não autenticado.'; end if;
  if not exists (select 1 from public.profiles where id = _uid and is_active) then
    raise exception 'Usuário inativo.'; end if;
  if _date > public.sp_today() then raise exception 'Não é possível registrar datas futuras.'; end if;
  if _date < public.sp_today() - 7 then raise exception 'Só é possível registrar até 7 dias atrás.'; end if;

  select * into _entry from public.daily_entries where user_id = _uid and entry_date = _date for update;
  if found then
    if _entry.status = 'approved' then
      raise exception 'Este registro já foi aprovado e não pode ser alterado.'; end if;
    update public.daily_entries set status = 'pending', submitted_at = now(),
      reviewed_by = null, reviewed_at = null, review_note = null where id = _entry.id;
    _id := _entry.id;
    delete from public.daily_entry_values where entry_id = _id;
  else
    insert into public.daily_entries (user_id, entry_date) values (_uid, _date) returning id into _id;
  end if;

  for _k in select id from public.kpi_definitions where is_active loop
    _v := coalesce((_values->>(_k.id::text))::integer, 0);
    if _v < 0 or _v > 100000 then raise exception 'Valores devem estar entre 0 e 100000.'; end if;
    insert into public.daily_entry_values (entry_id, kpi_id, value) values (_id, _k.id, _v);
  end loop;

  select p.full_name, t.manager_id into _name, _mgr
    from public.profiles p left join public.teams t on t.id = p.team_id where p.id = _uid;
  if _mgr is not null and _mgr <> _uid then
    insert into public.notifications (user_id, title, body, link)
    values (_mgr, 'Registro aguardando aprovação',
            coalesce(nullif(_name,''),'Colaborador') || ' enviou os indicadores de ' || to_char(_date,'DD/MM'),
            '/equipes/aprovacoes');
  end if;
  return _id;
end $$;

create or replace function public.review_daily_entry(_entry uuid, _approve boolean, _values jsonb default null, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _e public.daily_entries;
  _r record; _nv integer; _bonus integer; _all_met boolean := true; _has boolean := false;
begin
  select * into _e from public.daily_entries where id = _entry for update;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if _uid is null or not public.manages_user(_uid, _e.user_id) then
    raise exception 'Você não tem permissão para revisar este registro.'; end if;
  if _e.user_id = _uid and not public.has_role(_uid, 'admin') then
    raise exception 'Você não pode aprovar o próprio registro.'; end if;
  if _e.status <> 'pending' then raise exception 'Este registro não está aguardando aprovação.'; end if;

  if not _approve then
    if coalesce(trim(_note), '') = '' then raise exception 'Informe o motivo da recusa.'; end if;
    update public.daily_entries set status = 'rejected', reviewed_by = _uid, reviewed_at = now(),
      review_note = trim(_note) where id = _entry;
    insert into public.notifications (user_id, title, body, link)
    values (_e.user_id, 'Registro de ' || to_char(_e.entry_date,'DD/MM') || ' recusado', 'Motivo: ' || trim(_note), '/inicio');
    return;
  end if;

  if _values is not null then
    for _r in select * from public.daily_entry_values where entry_id = _entry loop
      if _values ? (_r.kpi_id::text) then
        _nv := (_values->>(_r.kpi_id::text))::integer;
        if _nv < 0 or _nv > 100000 then raise exception 'Valores devem estar entre 0 e 100000.'; end if;
        if _nv <> _r.value then
          update public.daily_entry_values set original_value = coalesce(original_value, value), value = _nv where id = _r.id;
        end if;
      end if;
    end loop;
  end if;

  update public.daily_entries set status = 'approved', reviewed_by = _uid, reviewed_at = now(),
    review_note = nullif(trim(coalesce(_note,'')), '') where id = _entry;

  for _r in select v.value, v.kpi_id, d.points_per_unit, d.name
            from public.daily_entry_values v join public.kpi_definitions d on d.id = v.kpi_id
            where v.entry_id = _entry loop
    _has := true;
    if _r.value * _r.points_per_unit > 0 then
      insert into public.points_ledger (user_id, source_type, source_id, points, description, ref_date)
      values (_e.user_id, 'kpi', _entry, _r.value * _r.points_per_unit, _r.name || ': ' || _r.value, _e.entry_date);
    end if;
    if _r.value < public.daily_goal_for(_e.user_id, _r.kpi_id) then _all_met := false; end if;
  end loop;

  select daily_goal_bonus into _bonus from public.app_settings limit 1;
  if _has and _all_met and coalesce(_bonus, 0) > 0 then
    insert into public.points_ledger (user_id, source_type, source_id, points, description, ref_date)
    values (_e.user_id, 'goal_bonus', _entry, _bonus, 'Bônus: todas as metas do dia', _e.entry_date);
  end if;

  insert into public.notifications (user_id, title, body, link)
  values (_e.user_id, 'Registro de ' || to_char(_e.entry_date,'DD/MM') || ' aprovado',
          case when _all_met and _has then 'Todas as metas batidas. Parabéns!' else 'Seus pontos foram lançados.' end, '/inicio');
end $$;

create or replace function public.reopen_daily_entry(_entry uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _e public.daily_entries;
begin
  select * into _e from public.daily_entries where id = _entry for update;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if _uid is null or not public.manages_user(_uid, _e.user_id) then raise exception 'Sem permissão.'; end if;
  if _e.status <> 'approved' then raise exception 'Somente registros aprovados podem ser reabertos.'; end if;
  insert into public.points_ledger (user_id, source_type, source_id, points, description, ref_date)
  select user_id, source_type, source_id, -sum(points), 'Estorno: registro reaberto', ref_date
    from public.points_ledger where source_id = _entry and source_type in ('kpi','goal_bonus')
    group by user_id, source_type, source_id, ref_date having sum(points) <> 0;
  update public.daily_entries set status = 'pending', reviewed_by = null, reviewed_at = null, review_note = null where id = _entry;
end $$;

create or replace function public.my_day_summary(_date date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'entry', (select jsonb_build_object('id', id, 'status', status, 'review_note', review_note, 'submitted_at', submitted_at)
              from public.daily_entries where user_id = auth.uid() and entry_date = _date),
    'tasks_pending', (select count(*) from public.tasks where assigned_to = auth.uid() and status = 'aberta' and due_date <= _date),
    'tasks_done', (select count(*) from public.tasks where assigned_to = auth.uid() and status = 'concluida'
                   and (completed_at at time zone 'America/Sao_Paulo')::date = _date),
    'month_points', (select coalesce(sum(points), 0) from public.points_ledger where user_id = auth.uid()
                     and ref_date between date_trunc('month', _date)::date and _date),
    'pending_approvals', (select count(*) from public.daily_entries e where e.status = 'pending'
                          and (e.user_id <> auth.uid() or public.has_role(auth.uid(),'admin'))
                          and public.manages_user(auth.uid(), e.user_id))
  )
$$;

create or replace function public.kpi_progress(_user uuid, _start date, _end date)
returns table (kpi_id uuid, key text, name text, unit text, sort_order integer, total integer, daily_goal integer, goal integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if _user <> auth.uid() and not public.manages_user(auth.uid(), _user) then raise exception 'Sem permissão.'; end if;
  return query
    select d.id, d.key, d.name, d.unit, d.sort_order,
      coalesce((select sum(v.value) from public.daily_entry_values v join public.daily_entries e on e.id = v.entry_id
                where v.kpi_id = d.id and e.user_id = _user and e.status = 'approved'
                  and e.entry_date between _start and _end), 0)::integer,
      public.daily_goal_for(_user, d.id),
      (public.daily_goal_for(_user, d.id) * public.expected_days(_start, _end))::integer
    from public.kpi_definitions d where d.is_active order by d.sort_order;
end $$;

create or replace function public.kpi_series(_user uuid, _start date, _end date)
returns table (entry_date date, kpi_id uuid, value integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if _user <> auth.uid() and not public.manages_user(auth.uid(), _user) then raise exception 'Sem permissão.'; end if;
  return query
    select e.entry_date, v.kpi_id, v.value from public.daily_entries e join public.daily_entry_values v on v.entry_id = e.id
    where e.user_id = _user and e.status = 'approved' and e.entry_date between _start and _end;
end $$;

create or replace function public.ranking(_start date, _end date)
returns jsonb language sql stable security definer set search_path = public as $$
  with pts as (
    select user_id, sum(points) as pts from public.points_ledger where ref_date between _start and _end group by user_id
  ), ind as (
    select p.id as user_id, p.full_name, p.avatar_url, p.team_id, t.name as team_name, t.color as team_color,
           coalesce(pts.pts, 0)::int as points
    from public.profiles p left join public.teams t on t.id = p.team_id left join pts on pts.user_id = p.id
    where p.is_active and exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('colaborador','gerente'))
  ), ranked as (
    select ind.*, rank() over (order by points desc) as position from ind
  )
  select jsonb_build_object(
    'individual', coalesce((select jsonb_agg(to_jsonb(r) order by r.position, r.full_name) from ranked r), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(x order by (x->>'points')::int desc) from (
        select jsonb_build_object('team_id', t.id, 'name', t.name, 'color', t.color,
               'points', coalesce(sum(i.points), 0), 'members', count(i.user_id)) as x
        from public.teams t left join ind i on i.team_id = t.id group by t.id) s), '[]'::jsonb))
$$;

create or replace function public.team_weekly(_team uuid, _weeks integer default 8)
returns table (week_start date, points integer)
language sql stable security definer set search_path = public as $$
  with w as (
    select (date_trunc('week', public.sp_today()) - (n || ' weeks')::interval)::date as ws
    from generate_series(0, greatest(_weeks, 1) - 1) n
  )
  select w.ws, coalesce((select sum(l.points) from public.points_ledger l join public.profiles p on p.id = l.user_id
                          where p.team_id = _team and l.ref_date between w.ws and w.ws + 6), 0)::int
  from w order by w.ws
$$;

revoke execute on function public.submit_daily_entry(date, jsonb) from public, anon;
revoke execute on function public.review_daily_entry(uuid, boolean, jsonb, text) from public, anon;
revoke execute on function public.reopen_daily_entry(uuid) from public, anon;
revoke execute on function public.my_day_summary(date) from public, anon;
revoke execute on function public.kpi_progress(uuid, date, date) from public, anon;
revoke execute on function public.kpi_series(uuid, date, date) from public, anon;
revoke execute on function public.ranking(date, date) from public, anon;
revoke execute on function public.team_weekly(uuid, integer) from public, anon;
grant execute on function public.submit_daily_entry(date, jsonb) to authenticated;
grant execute on function public.review_daily_entry(uuid, boolean, jsonb, text) to authenticated;
grant execute on function public.reopen_daily_entry(uuid) to authenticated;
grant execute on function public.my_day_summary(date) to authenticated;
grant execute on function public.kpi_progress(uuid, date, date) to authenticated;
grant execute on function public.kpi_series(uuid, date, date) to authenticated;
grant execute on function public.ranking(date, date) to authenticated;
grant execute on function public.team_weekly(uuid, integer) to authenticated;

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
