
create type public.app_role as enum ('gestor','atendimento');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort int not null default 0
);
create table public.user_units (
  user_id uuid not null,
  unit_id uuid not null references public.units(id) on delete cascade,
  primary key (user_id, unit_id)
);
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  phone text,
  unit_id uuid not null references public.units(id),
  responsible_id uuid,
  enrollment_date date,
  theory_status text not null default 'nunca_fez',
  attempts_count int,
  followup_status text not null default 'a_contatar',
  study_status text not null default 'nao_informado',
  platform_access text not null default 'nao_informado',
  main_difficulty text,
  next_action text,
  next_return_date date,
  exam_date date,
  direction_referral text,
  notes text,
  prep_type text,
  lessons_included int,
  study_activity text,
  study_activity_due date,
  teacher_guidance text,
  resumed_at date,
  last_contact_at timestamptz,
  last_contact_summary text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.students(unit_id);
create index on public.students(cpf);
create index on public.students(phone);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  contacted_at timestamptz not null default now(),
  channel text not null,
  result text not null,
  report text,
  difficulty text,
  next_action text,
  return_date date,
  decision text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now()
);
create index on public.contacts(student_id);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  exam_date date not null,
  result text not null,
  score numeric,
  difficulties text,
  next_step text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  test_date date not null,
  correct int not null,
  total int not null,
  subjects text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_date date not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  path text not null,
  file_name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select on public.profiles, public.user_roles, public.units, public.user_units, public.app_settings to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.user_roles, public.user_units, public.units, public.app_settings to authenticated;
grant select, insert, update, delete on public.students, public.contacts, public.exam_attempts, public.mock_tests, public.lessons, public.attachments to authenticated;
grant all on public.profiles, public.user_roles, public.units, public.user_units, public.app_settings, public.students, public.contacts, public.exam_attempts, public.mock_tests, public.lessons, public.attachments to service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.can_access_unit(_user_id uuid, _unit uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'gestor') or exists (select 1 from public.user_units where user_id=_user_id and unit_id=_unit)
$$;
create or replace function public.can_access_student(_user_id uuid, _student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s where s.id=_student and public.can_access_unit(_user_id, s.unit_id))
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.units enable row level security;
alter table public.user_units enable row level security;
alter table public.app_settings enable row level security;
alter table public.students enable row level security;
alter table public.contacts enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.mock_tests enable row level security;
alter table public.lessons enable row level security;
alter table public.attachments enable row level security;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "roles read own or gestor" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'gestor'));
create policy "roles gestor manage" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'gestor')) with check (public.has_role(auth.uid(),'gestor'));
create policy "units read" on public.units for select to authenticated using (true);
create policy "units gestor manage" on public.units for all to authenticated using (public.has_role(auth.uid(),'gestor')) with check (public.has_role(auth.uid(),'gestor'));
create policy "uu read" on public.user_units for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'gestor'));
create policy "uu gestor manage" on public.user_units for all to authenticated using (public.has_role(auth.uid(),'gestor')) with check (public.has_role(auth.uid(),'gestor'));
create policy "settings read" on public.app_settings for select to authenticated using (true);
create policy "settings gestor manage" on public.app_settings for all to authenticated using (public.has_role(auth.uid(),'gestor')) with check (public.has_role(auth.uid(),'gestor'));

create policy "students access" on public.students for select to authenticated using (public.can_access_unit(auth.uid(), unit_id));
create policy "students insert" on public.students for insert to authenticated with check (public.can_access_unit(auth.uid(), unit_id));
create policy "students update" on public.students for update to authenticated using (public.can_access_unit(auth.uid(), unit_id)) with check (public.can_access_unit(auth.uid(), unit_id));
create policy "students delete gestor" on public.students for delete to authenticated using (public.has_role(auth.uid(),'gestor'));

create policy "contacts read" on public.contacts for select to authenticated using (public.can_access_student(auth.uid(), student_id));
create policy "contacts insert" on public.contacts for insert to authenticated with check (public.can_access_student(auth.uid(), student_id));
create policy "exams read" on public.exam_attempts for select to authenticated using (public.can_access_student(auth.uid(), student_id));
create policy "exams insert" on public.exam_attempts for insert to authenticated with check (public.can_access_student(auth.uid(), student_id));
create policy "exams update" on public.exam_attempts for update to authenticated using (public.can_access_student(auth.uid(), student_id));
create policy "mocks all" on public.mock_tests for all to authenticated using (public.can_access_student(auth.uid(), student_id)) with check (public.can_access_student(auth.uid(), student_id));
create policy "lessons all" on public.lessons for all to authenticated using (public.can_access_student(auth.uid(), student_id)) with check (public.can_access_student(auth.uid(), student_id));
create policy "att all" on public.attachments for all to authenticated using (public.can_access_student(auth.uid(), student_id)) with check (public.can_access_student(auth.uid(), student_id));

create or replace function public.students_audit() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end $$;
create trigger trg_students_audit before insert or update on public.students for each row execute function public.students_audit();

create or replace function public.set_created_by() returns trigger language plpgsql set search_path = public as $$
begin new.created_by := coalesce(new.created_by, auth.uid()); return new; end $$;
create trigger t1 before insert on public.contacts for each row execute function public.set_created_by();
create trigger t2 before insert on public.exam_attempts for each row execute function public.set_created_by();
create trigger t3 before insert on public.mock_tests for each row execute function public.set_created_by();
create trigger t4 before insert on public.lessons for each row execute function public.set_created_by();
create trigger t5 before insert on public.attachments for each row execute function public.set_created_by();

create or replace function public.contact_apply() returns trigger language plpgsql security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where id = new.student_id;
  update public.students set
    last_contact_at = greatest(coalesce(last_contact_at, new.contacted_at), new.contacted_at),
    last_contact_summary = coalesce(nullif(new.report,''), last_contact_summary),
    main_difficulty = coalesce(nullif(new.difficulty,''), main_difficulty),
    next_action = case when new.decision is not null then null else coalesce(nullif(new.next_action,''), next_action) end,
    next_return_date = case when new.decision is not null then null else new.return_date end,
    followup_status = case
      when new.decision is not null then 'pausa_solicitada'
      when s.followup_status = 'concluido' then 'concluido'
      when new.result = 'conversou' then 'em_preparacao'
      when new.result in ('nao_atendeu','sem_resposta') and s.followup_status in ('a_contatar','sem_retorno') then 'sem_retorno'
      else s.followup_status end,
    resumed_at = case when new.result='conversou' and s.followup_status in ('sem_retorno','pausa_solicitada') then (new.contacted_at at time zone 'America/Sao_Paulo')::date else resumed_at end,
    updated_at = now()
  where id = new.student_id;
  return new;
end $$;
create trigger trg_contact_apply after insert on public.contacts for each row execute function public.contact_apply();

create or replace function public.exam_apply() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.result = 'aprovado' then
    update public.students set theory_status='aprovado', followup_status='concluido', direction_referral='pendente',
      next_action='Conferir pendências e encaminhar à direção', next_return_date=(now() at time zone 'America/Sao_Paulo')::date,
      exam_date=null, attempts_count=(select count(*) from public.exam_attempts where student_id=new.student_id and result<>'faltou'), updated_at=now()
    where id=new.student_id;
  elsif new.result = 'reprovado' then
    update public.students set theory_status='reprovado', followup_status='em_preparacao',
      next_action='Entender dificuldades e organizar nova preparação', next_return_date=(now() at time zone 'America/Sao_Paulo')::date,
      exam_date=null, attempts_count=(select count(*) from public.exam_attempts where student_id=new.student_id and result<>'faltou'), updated_at=now()
    where id=new.student_id;
  else
    update public.students set exam_date=null, next_action=coalesce(nullif(new.next_step,''),'Entender motivo da falta e remarcar prova'),
      next_return_date=(now() at time zone 'America/Sao_Paulo')::date, updated_at=now() where id=new.student_id;
  end if;
  return new;
end $$;
create trigger trg_exam_apply after insert on public.exam_attempts for each row execute function public.exam_apply();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare is_first boolean;
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  select not exists (select 1 from public.user_roles where role='gestor') into is_first;
  insert into public.user_roles(user_id, role) values (new.id, case when is_first then 'gestor'::public.app_role else 'atendimento'::public.app_role end);
  insert into public.user_units(user_id, unit_id) select new.id, id from public.units where name='João Pinheiro';
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.units(name, sort) values ('João Pinheiro',1),('Luizlândia do Oeste–JK',2),('Varjão de Minas',3),('São Gonçalo do Abaeté',4);
insert into public.app_settings(key, value) values ('lessons_default', '10'::jsonb), ('courses', '[]'::jsonb);

create policy "sf read" on storage.objects for select to authenticated using (bucket_id='student-files' and public.can_access_student(auth.uid(), ((storage.foldername(name))[1])::uuid));
create policy "sf insert" on storage.objects for insert to authenticated with check (bucket_id='student-files' and public.can_access_student(auth.uid(), ((storage.foldername(name))[1])::uuid));
