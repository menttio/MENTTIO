-- Nivel B · Modelo de datos completo en Supabase (réplica de las entidades de Base44).
-- Diseño: ids text (se conservan los de Base44 al migrar), campos anidados en jsonb,
-- RLS activado sin políticas públicas (de momento solo entra la service_role / Worker;
-- las políticas ligadas a Supabase Auth se añaden en la Fase 4).

-- Función reutilizable para mantener updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper para no repetir el trigger en cada tabla.
-- (Se aplica manualmente por tabla más abajo.)

-- ============================ profiles (entidad User) ============================
create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text, -- se enlazará a auth.users en Fase 4
  email text unique not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================ subjects ============================
create table if not exists public.subjects (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  icon text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

-- ============================ teachers ============================
create table if not exists public.teachers (
  id text primary key default gen_random_uuid()::text,
  user_email text not null,
  full_name text not null,
  phone text,
  education text,
  experience_years numeric,
  profile_photo text,
  bio text,
  subjects jsonb,                       -- [{subject_id, subject_name, level, price_per_hour, max_group_students, group_prices}]
  rating numeric,
  total_classes numeric,
  teaching_methods jsonb,               -- string[]
  specializations jsonb,                -- string[]
  languages jsonb,                      -- string[]
  certifications jsonb,                 -- string[]
  subscription_active boolean default false,
  subscription_expires date,
  subscription_plan text default 'basic' check (subscription_plan in ('basic', 'premium', 'commission')),
  commission_percentage numeric default 25,
  subscription_exempt boolean default false,
  trial_used boolean default false,
  trial_active boolean default false,
  trial_start_date date,
  trial_end_date date,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_connect_account_id text,
  stripe_connect_enabled boolean default false,
  tour_completed boolean default false,
  availability_tour_completed boolean default false,
  calendar_tour_completed boolean default false,
  subjects_tour_completed boolean default false,
  workload_tour_completed boolean default false,
  profile_tour_completed boolean default false,
  students_tour_completed boolean default false,
  google_calendar_connected boolean default false,
  google_calendar_tokens jsonb,
  corporate_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_teachers_user_email on public.teachers (user_email);

-- ============================ students ============================
create table if not exists public.students (
  id text primary key default gen_random_uuid()::text,
  user_email text not null,
  full_name text not null,
  profile_photo text,
  phone text,
  assigned_teachers jsonb,              -- [{teacher_id, teacher_name, subject_id, subject_name}]
  google_calendar_connected boolean default false,
  google_calendar_tokens jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_students_user_email on public.students (user_email);

-- ============================ availability ============================
create table if not exists public.availability (
  id text primary key default gen_random_uuid()::text,
  teacher_id text not null,
  type text not null check (type in ('regular', 'exception')),
  day_of_week integer,
  specific_date date,
  time_slots jsonb,                     -- [{start_time, end_time}]
  is_unavailable boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_availability_teacher on public.availability (teacher_id);

-- ============================ bookings ============================
create table if not exists public.bookings (
  id text primary key default gen_random_uuid()::text,
  student_id text,
  student_name text,
  student_email text,
  teacher_id text,
  teacher_name text,
  teacher_email text,
  subject_id text,
  subject_name text,
  date date,
  start_time text,
  end_time text,
  duration_minutes numeric,
  price numeric,
  platform_fee numeric,
  teacher_payout numeric,
  status text default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  class_type text default 'individual' check (class_type in ('individual', 'group')),
  max_students numeric,
  enrolled_students jsonb,              -- [{student_id, student_name, student_email, payment_status}]
  files jsonb,                          -- [{name, url, uploaded_by}]
  recording_url text,
  meet_link text,
  notes text,
  progress_note text,
  progress_rating numeric check (progress_rating between 1 and 5),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  payment_method text check (payment_method in ('stripe', 'bizum', 'other')),
  stripe_payment_id text,
  google_event_id_teacher text,
  google_event_id_student text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_bookings_teacher on public.bookings (teacher_id);
create index if not exists idx_bookings_student on public.bookings (student_id);
create index if not exists idx_bookings_date on public.bookings (date);
create index if not exists idx_bookings_status on public.bookings (status);

-- ============================ conversations ============================
create table if not exists public.conversations (
  id text primary key default gen_random_uuid()::text,
  student_id text not null,
  student_name text,
  student_email text,
  teacher_id text not null,
  teacher_name text,
  teacher_email text,
  last_message text,
  last_message_date timestamptz,
  last_message_by text,
  unread_count_student integer default 0,
  unread_count_teacher integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_conversations_teacher on public.conversations (teacher_id);
create index if not exists idx_conversations_student on public.conversations (student_id);

-- ============================ messages ============================
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  sender_type text check (sender_type in ('student', 'teacher')),
  sender_id text,
  sender_name text,
  content text,
  is_read boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_messages_conversation on public.messages (conversation_id);

-- ============================ notifications ============================
create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  user_email text,
  type text check (type in ('booking_new', 'booking_modified', 'booking_cancelled', 'message_new', 'reminder_24h')),
  title text,
  message text,
  related_id text,
  link_page text,
  is_read boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_notifications_user_email on public.notifications (user_email);

-- ============================ reviews ============================
create table if not exists public.reviews (
  id text primary key default gen_random_uuid()::text,
  teacher_id text not null,
  teacher_name text,
  student_id text,
  student_name text,
  booking_id text,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_reviews_teacher on public.reviews (teacher_id);

-- ============================ push_subscriptions ============================
create table if not exists public.push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_email text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_push_user_email on public.push_subscriptions (user_email);

-- ============================ trial_used ============================
create table if not exists public.trial_used (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  used_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_trial_used_email on public.trial_used (email);

-- ============================ triggers updated_at ============================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','subjects','teachers','students','availability','bookings',
    'conversations','messages','notifications','reviews','push_subscriptions'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end$$;

-- ============================ RLS (sin políticas públicas todavía) ============================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','subjects','teachers','students','availability','bookings',
    'conversations','messages','notifications','reviews','push_subscriptions','trial_used'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end$$;
