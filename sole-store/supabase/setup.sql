-- =====================================================================
-- Sole Store — configuración de Supabase (se ejecuta UNA sola vez)
--
-- Cómo usarlo:
--   1. En supabase.com abre tu proyecto → SQL Editor → New query.
--   2. Cambia CORREO_DE_LA_ADMINISTRADORA (al final) por el correo real.
--   3. Pega todo este archivo y pulsa "Run".
--
-- Qué hace:
--   - Crea las tablas de productos, ajustes, administradoras, autorizaciones y mensajes.
--   - Activa reglas de seguridad: cualquiera puede VER la tienda, pero solo las
--     administradoras pueden CAMBIARLA. Las autorizaciones no se pueden editar ni borrar
--     (son la prueba legal de la Ley 1581).
--   - Crea la carpeta pública de fotos "product-images".
-- =====================================================================

-- Administradoras ------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

-- ¿La persona que hace la petición es administradora? (correo confirmado de su sesión)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Nunca dejar la tienda sin administradora
create or replace function public.keep_one_admin() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.admins) <= 1 then
    raise exception 'Debe quedar al menos una administradora.';
  end if;
  return old;
end $$;
drop trigger if exists keep_one_admin on public.admins;
create trigger keep_one_admin before delete on public.admins for each row execute function public.keep_one_admin();

-- Productos ------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  sort integer not null default 0,
  active boolean not null default true,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Ajustes de la tienda (una fila con key = 'store') ----------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Prueba de autorizaciones (solo se pueden agregar) -----------------------
create table if not exists public.consents (
  id bigint generated always as identity primary key,
  record jsonb not null check (pg_column_size(record) < 20000),
  created_at timestamptz not null default now()
);

-- Mensajes del formulario de contacto -----------------------------------
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  message jsonb not null check (pg_column_size(message) < 20000),
  created_at timestamptz not null default now()
);

-- Reglas de seguridad (Row Level Security) -------------------------------
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.consents enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "ver productos" on public.products;
create policy "ver productos" on public.products for select using (active or public.is_admin());
drop policy if exists "editar productos" on public.products;
create policy "editar productos" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ver ajustes" on public.settings;
create policy "ver ajustes" on public.settings for select using (true);
drop policy if exists "editar ajustes" on public.settings;
create policy "editar ajustes" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins ven admins" on public.admins;
create policy "admins ven admins" on public.admins for select to authenticated using (public.is_admin());
drop policy if exists "admins agregan admins" on public.admins;
create policy "admins agregan admins" on public.admins for insert to authenticated with check (public.is_admin());
drop policy if exists "admins quitan admins" on public.admins;
create policy "admins quitan admins" on public.admins for delete to authenticated using (public.is_admin());

drop policy if exists "registrar autorizacion" on public.consents;
create policy "registrar autorizacion" on public.consents for insert to anon, authenticated with check (true);
drop policy if exists "admins ven autorizaciones" on public.consents;
create policy "admins ven autorizaciones" on public.consents for select to authenticated using (public.is_admin());

drop policy if exists "enviar mensaje" on public.contact_messages;
create policy "enviar mensaje" on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists "admins ven mensajes" on public.contact_messages;
create policy "admins ven mensajes" on public.contact_messages for select to authenticated using (public.is_admin());
drop policy if exists "admins borran mensajes" on public.contact_messages;
create policy "admins borran mensajes" on public.contact_messages for delete to authenticated using (public.is_admin());

-- Fotos -----------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

drop policy if exists "admins ven fotos" on storage.objects;
create policy "admins ven fotos" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins suben fotos" on storage.objects;
create policy "admins suben fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins cambian fotos" on storage.objects;
create policy "admins cambian fotos" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins borran fotos" on storage.objects;
create policy "admins borran fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Primera administradora (CAMBIA EL CORREO) -------------------------------
insert into public.admins (email) values (lower('CORREO_DE_LA_ADMINISTRADORA'))
  on conflict (email) do nothing;
