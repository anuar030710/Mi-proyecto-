-- =====================================================================
-- Soles Store — configuración de Supabase (se ejecuta UNA sola vez)
--
-- Cómo usarlo:
--   1. En supabase.com abre tu proyecto → SQL Editor → New query.
--   2. Cambia CORREO_DE_LA_ADMINISTRADORA (al final) por el correo real.
--   3. Pega todo este archivo y pulsa "Run".
--
-- Qué hace:
--   - Crea las tablas de productos, pedidos, ajustes, administradoras, autorizaciones y mensajes.
--   - Descuenta el inventario automáticamente con cada pedido (place_order) y lo devuelve
--     si la administradora cancela el pedido (cancel_order).
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

-- Pedidos e inventario ---------------------------------------------------
-- Las clientas NO pueden escribir en "products" ni en "orders". Solo pueden llamar a
-- place_order(), que revisa las unidades, las descuenta y guarda el pedido, todo junto.
create table if not exists public.orders (
  id text primary key,
  status text not null default 'nuevo' check (status in ('nuevo', 'pagado', 'enviado', 'cancelado')),
  data jsonb not null check (pg_column_size(data) < 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "admins ven pedidos" on public.orders;
create policy "admins ven pedidos" on public.orders for select to authenticated using (public.is_admin());
-- Cambiar estado (pagado / enviado). Cancelar se hace con cancel_order() para devolver unidades.
drop policy if exists "admins cambian estado" on public.orders;
create policy "admins cambian estado" on public.orders for update to authenticated
  using (public.is_admin() and status <> 'cancelado') with check (public.is_admin() and status <> 'cancelado');

-- Suma las unidades de los tonos (si los tonos llevan "stock").
create or replace function public.tones_total(t jsonb) returns integer
language sql immutable as $$
  select coalesce(sum(greatest(coalesce((v->>'stock')::int, 0), 0)), 0)::int from jsonb_array_elements(coalesce(t, '[]'::jsonb)) v;
$$;

-- Ajusta las unidades de un producto (y tono) en "delta" (negativo = descontar).
create or replace function public.adjust_stock(p_id text, p_tone text, p_delta integer) returns void
language plpgsql security definer set search_path = public as $$
declare prod record; tones jsonb; idx integer; avail integer;
begin
  select * into prod from public.products where id = p_id for update;
  if not found then raise exception 'SIN_STOCK:%', p_id; end if;
  tones := coalesce(prod.data->'tones', '[]'::jsonb);
  idx := null;
  if p_tone is not null and jsonb_array_length(tones) > 0 then
    select (ord - 1)::int into idx from jsonb_array_elements(tones) with ordinality as t(v, ord) where v->>'name' = p_tone limit 1;
  end if;
  if idx is not null and (tones->idx) ? 'stock' then
    avail := coalesce((tones->idx->>'stock')::int, 0);
    if avail + p_delta < 0 then raise exception 'SIN_STOCK:% (%)', prod.data->>'name', p_tone; end if;
    tones := jsonb_set(tones, array[idx::text, 'stock'], to_jsonb(avail + p_delta));
    update public.products
      set data = jsonb_set(jsonb_set(data, '{tones}', tones), '{stock}', to_jsonb(public.tones_total(tones))), updated_at = now()
      where id = p_id;
  else
    avail := coalesce((prod.data->>'stock')::int, 0);
    if avail + p_delta < 0 then raise exception 'SIN_STOCK:%', prod.data->>'name'; end if;
    update public.products set data = jsonb_set(data, '{stock}', to_jsonb(avail + p_delta)), updated_at = now() where id = p_id;
  end if;
end $$;
revoke all on function public.adjust_stock(text, text, integer) from public, anon, authenticated;

-- Crear pedido: valida, descuenta unidades y guarda. Si algo no alcanza, no se descuenta nada.
create or replace function public.place_order(p_order jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; prod record; q integer; unit integer; subtotal integer := 0; lines jsonb := '[]'::jsonb; oid text;
begin
  if jsonb_typeof(p_order->'items') is distinct from 'array'
     or jsonb_array_length(p_order->'items') = 0 or jsonb_array_length(p_order->'items') > 30 then
    raise exception 'PEDIDO_INVALIDO';
  end if;
  oid := p_order->>'id';
  if oid is null or oid !~ '^SOLES-[0-9]{6}-[A-Z0-9]{4}$' then raise exception 'PEDIDO_INVALIDO'; end if;
  for it in select * from jsonb_array_elements(p_order->'items') loop
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 20 then raise exception 'PEDIDO_INVALIDO'; end if;
    select * into prod from public.products where id = it->>'id' and active;
    if not found then raise exception 'SIN_STOCK:%', coalesce(it->>'name', 'un producto'); end if;
    perform public.adjust_stock(prod.id, it->>'tone', -q);
    -- Precio calculado aquí (no se confía en el del navegador), redondeado a $100.
    unit := (round(((prod.data->>'price')::numeric * (1 - coalesce((prod.data->>'discount')::numeric, 0) / 100)) / 100) * 100)::int;
    subtotal := subtotal + unit * q;
    lines := lines || jsonb_build_object('id', prod.id, 'name', prod.data->>'name', 'tone', it->>'tone', 'qty', q, 'unit', unit, 'total', unit * q);
  end loop;
  insert into public.orders (id, data)
    values (oid, (p_order - 'items') || jsonb_build_object('items', lines, 'serverSubtotal', subtotal));
  return jsonb_build_object('id', oid, 'items', lines, 'subtotal', subtotal);
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- Cancelar pedido (solo administradoras): devuelve las unidades al inventario.
create or replace function public.cancel_order(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare o record; it jsonb;
begin
  if not public.is_admin() then raise exception 'NO_AUTORIZADO'; end if;
  select * into o from public.orders where id = p_id for update;
  if not found or o.status = 'cancelado' then return; end if;
  for it in select * from jsonb_array_elements(o.data->'items') loop
    begin
      perform public.adjust_stock(it->>'id', it->>'tone', (it->>'qty')::int);
    exception when others then null; -- si el producto ya no existe, se ignora
    end;
  end loop;
  update public.orders set status = 'cancelado', updated_at = now() where id = p_id;
end $$;
grant execute on function public.cancel_order(text) to authenticated;

-- Primera administradora (CAMBIA EL CORREO) -------------------------------
insert into public.admins (email) values (lower('CORREO_DE_LA_ADMINISTRADORA'))
  on conflict (email) do nothing;
