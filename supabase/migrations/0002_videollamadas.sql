-- Fase 2: el Worker asume la creación de videollamadas y la recuperación de grabaciones
-- (antes lo hacía el cron de n8n "Creacion videollamada"). Estas columnas permiten al cron
-- del Worker saber qué reservas ya tienen videollamada / grabación y no duplicar trabajo.

alter table public.bookings_ledger
  add column if not exists meet_link text,
  add column if not exists recording_url text;
