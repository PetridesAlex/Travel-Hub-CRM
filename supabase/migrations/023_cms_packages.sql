-- Website packages CMS (Honeywell Travel catalog).
-- Shared with the public Honeywell site via the same Supabase project.
-- Safe to re-run. Authenticated Travel Hub users can manage all rows (v1).

create table if not exists public.cms_packages (
  id uuid primary key default gen_random_uuid(),
  legacy_id integer not null unique,
  title text not null,
  destination text,
  category text,
  price numeric,
  duration text,
  description text,
  long_description text,
  image text,
  featured boolean not null default false,
  package_type text,
  hidden boolean not null default false,
  published boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cms_packages_category on public.cms_packages (category);
create index if not exists idx_cms_packages_destination on public.cms_packages (destination);
create index if not exists idx_cms_packages_published on public.cms_packages (published) where published = true;
create index if not exists idx_cms_packages_updated on public.cms_packages (updated_at desc);

alter table public.cms_packages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'cms_packages' and policyname = 'Public can read published cms packages'
  ) then
    create policy "Public can read published cms packages"
      on public.cms_packages for select to anon, authenticated
      using (published = true and hidden = false);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'cms_packages' and policyname = 'Authenticated can read all cms packages'
  ) then
    create policy "Authenticated can read all cms packages"
      on public.cms_packages for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'cms_packages' and policyname = 'Authenticated can insert cms packages'
  ) then
    create policy "Authenticated can insert cms packages"
      on public.cms_packages for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'cms_packages' and policyname = 'Authenticated can update cms packages'
  ) then
    create policy "Authenticated can update cms packages"
      on public.cms_packages for update to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'cms_packages' and policyname = 'Authenticated can delete cms packages'
  ) then
    create policy "Authenticated can delete cms packages"
      on public.cms_packages for delete to authenticated using (true);
  end if;
end $$;
