-- ============================================================
-- AGENDA CHEIA 360 - SCHEMA SUPABASE v3 (seguro)
-- Cole no SQL Editor do Supabase e rode UMA vez.
--
-- Modelo de acesso:
--  * anon (visitante)  -> NENHUM acesso direto às tabelas.
--    Leitura pública e agendamento passam por route handlers
--    do Next.js (server-side, service_role, com validação).
--  * authenticated (dono) -> acessa SOMENTE os dados do(s)
--    próprio(s) negócio(s), via RLS (businesses.owner_id).
--  * Horários guardados em hora local do negócio (timestamp
--    sem fuso). Fuso do negócio fica em businesses.timezone.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;  -- necessário p/ exclusion constraint com uuid

-- ------------------------------------------------
-- 1. BUSINESSES
-- ------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 2 and 100),
  owner_name text,
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  logo_url text,
  timezone text not null default 'America/Sao_Paulo',
  open_time time not null default '08:00',
  close_time time not null default '19:00',
  slot_minutes int not null default 30 check (slot_minutes in (15, 20, 30, 60)),
  days_off smallint[] not null default '{0}',  -- 0=domingo ... 6=sábado
  created_at timestamptz not null default now(),
  constraint valid_hours check (close_time > open_time)
);

-- ------------------------------------------------
-- 2. SERVICES
-- ------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  price numeric(10,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------
-- 3. CLIENTS (dados pessoais - LGPD: só nome + WhatsApp)
-- ------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),  -- normalizado: 55 + DDD + número
  last_visit date,
  consent_at timestamptz not null default now(),                  -- registro de consentimento LGPD
  created_at timestamptz not null default now(),
  unique (business_id, whatsapp)
);

-- ------------------------------------------------
-- 4. APPOINTMENTS
-- ------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'done', 'no_show')),
  created_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time),

  -- Intervalo calculado automaticamente [início, fim)
  period tsrange generated always as (
    tsrange(date + start_time, date + end_time, '[)')
  ) stored,

  -- ANTI-OVERBOOKING: o banco impede dois agendamentos confirmados
  -- sobrepostos no mesmo negócio, mesmo com requisições simultâneas.
  constraint no_overlap exclude using gist (
    business_id with =,
    period with &&
  ) where (status = 'confirmed')
);

-- ------------------------------------------------
-- 5. CAMPAIGNS
-- ------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('reengagement', 'birthday', 'promo', 'reminder', 'confirmation')),
  message text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_businesses_owner on public.businesses(owner_id);
create index if not exists idx_services_business on public.services(business_id);
create index if not exists idx_services_active on public.services(business_id) where active = true;
create index if not exists idx_clients_business on public.clients(business_id);
create index if not exists idx_appointments_business_date on public.appointments(business_id, date);
create index if not exists idx_appointments_client on public.appointments(client_id);
create index if not exists idx_campaigns_business on public.campaigns(business_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.businesses   enable row level security;
alter table public.services     enable row level security;
alter table public.clients      enable row level security;
alter table public.appointments enable row level security;
alter table public.campaigns    enable row level security;

-- Defesa em profundidade: visitante anônimo não tem NENHUM privilégio nas tabelas.
revoke all on public.businesses, public.services, public.clients,
              public.appointments, public.campaigns from anon;

-- Helper: o usuário logado é dono deste negócio?
create or replace function public.is_business_owner(bid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = bid and b.owner_id = auth.uid()
  );
$$;
revoke all on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated;

-- Dono: acesso apenas ao que é dele.
create policy "owner manages own businesses"
  on public.businesses for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner manages own services"
  on public.services for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "owner manages own clients"
  on public.clients for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "owner manages own appointments"
  on public.appointments for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "owner manages own campaigns"
  on public.campaigns for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- Sem policies para anon: leitura pública e agendamento acontecem
-- SOMENTE nos route handlers do Next.js com service_role (server-only).
-- service_role ignora RLS por padrão, não precisa de policy.

-- Seed de exemplo (opcional; troque o UUID pelo id do usuário em Authentication > Users):
-- insert into public.businesses (owner_id, slug, name, owner_name, whatsapp)
-- values ('00000000-0000-0000-0000-000000000000', 'barbearia-do-joao', 'Barbearia do João', 'João Silva', '5511999999999');
