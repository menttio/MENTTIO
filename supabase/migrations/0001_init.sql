-- Menttio · Esquema inicial (sustituye a las 2 Google Sheets que mantenía n8n)
--
-- Hoja "Alumnos_data_sheet"  -> tabla bookings_ledger
-- Hoja "Grabaciones clases"  -> tabla class_log
--
-- El Cloudflare Worker accede con la SERVICE ROLE KEY, que ignora RLS.
-- Activamos RLS sin políticas públicas => nadie más puede leer/escribir.

-- ---------------------------------------------------------------------------
-- Libro de reservas (antes "Alumnos_data_sheet")
-- ---------------------------------------------------------------------------
create table if not exists public.bookings_ledger (
  booking_id           text primary key,           -- "Pedido ID"
  student_id           text,                        -- "Alumno ID"
  student_first_name   text,
  student_last_name    text,
  student_email        text,                        -- "Correo electrónico"
  student_phone        text,                        -- "Teléfono"
  subject_name         text,                        -- "Plan" / asignatura
  price                numeric,                     -- "Precio"
  start_datetime       timestamptz,                 -- "Fecha de inicio"
  teacher_first_name   text,
  teacher_last_name    text,
  teacher_name         text,                        -- "Profesor"
  teacher_email        text,                        -- "Correo electrónico profesor"
  teacher_phone        text,
  info                 text,                         -- "Información"
  status               text default 'scheduled',    -- "Estado": scheduled | modified | cancelled | completed
  payment_status       text default 'pending',      -- pending | paid
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists bookings_ledger_student_email_idx on public.bookings_ledger (student_email);
create index if not exists bookings_ledger_teacher_email_idx on public.bookings_ledger (teacher_email);
create index if not exists bookings_ledger_start_dt_idx       on public.bookings_ledger (start_datetime);

-- ---------------------------------------------------------------------------
-- Registro de clases (antes hoja "Grabaciones clases" / "RaulNavamuel")
-- ---------------------------------------------------------------------------
create table if not exists public.class_log (
  class_id     text primary key,    -- "ID clase" (= booking_id)
  student_id   text,                -- "ID alumno"
  date         date,                -- "Fecha"
  subject_name text,                -- "Asignatura"
  teacher_name text,                -- "Profesor"
  status       text default 'scheduled'  -- "Estado"
);

create index if not exists class_log_student_id_idx on public.class_log (student_id);
create index if not exists class_log_date_idx        on public.class_log (date);

-- ---------------------------------------------------------------------------
-- Mantener updated_at al día en bookings_ledger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bookings_ledger_updated_at on public.bookings_ledger;
create trigger trg_bookings_ledger_updated_at
  before update on public.bookings_ledger
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bloqueo de acceso (solo la service role key del Worker entra)
-- ---------------------------------------------------------------------------
alter table public.bookings_ledger enable row level security;
alter table public.class_log       enable row level security;
