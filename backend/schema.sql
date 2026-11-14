create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

insert into public.profiles (user_id, display_name)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (user_id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  category text not null check (category in ('shoes', 'clothing', 'bags')),
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= price),
  image_url text not null,
  description text not null default '',
  features text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  discount_percent integer not null check (discount_percent between 1 and 90),
  image_url text not null,
  product_id uuid references public.products (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists products_active_category_idx on public.products (is_active, category);
create index if not exists offers_active_idx on public.offers (is_active);
create index if not exists reviews_product_created_idx on public.reviews (product_id, created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles"
  on public.profiles for select using (true);
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select using (is_active);
drop policy if exists "Public can read active offers" on public.offers;
create policy "Public can read active offers"
  on public.offers for select using (is_active);
drop policy if exists "Public can read reviews" on public.reviews;
create policy "Public can read reviews"
  on public.reviews for select using (true);
drop policy if exists "Signed-in users can create their own reviews" on public.reviews;
create policy "Signed-in users can create their own reviews"
  on public.reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews"
  on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews"
  on public.reviews for delete to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.products, public.offers, public.profiles, public.reviews to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.reviews to authenticated;

insert into public.products
  (id, name, brand, category, price, compare_at_price, image_url, description, features, is_featured)
values
  ('e6288576-c470-4c68-bdcf-96c829496ad1', 'Air Motion 01', 'Nike', 'shoes', 129, 159, '/img/shoe-Nike-1.png', 'A lightweight everyday runner with a responsive feel and a clean, versatile profile.', array['Responsive cushioning', 'Breathable mesh', 'Rubber grip outsole'], true),
  ('fc01d18f-073b-47d2-8f52-949e0b56d8e2', 'Court Legacy', 'Jordan', 'shoes', 145, 180, '/img/shoe-jordan-1.png', 'A court-inspired classic, updated for all-day comfort and easy styling.', array['Padded collar', 'Durable leather upper', 'Classic court traction'], true),
  ('3903cf12-8d75-47b6-a27f-c45d5810687f', 'Street Form', 'New Balance', 'shoes', 110, null, '/img/shoe-newBalance-1.png', 'Modern everyday comfort with a balanced, soft ride from the first step.', array['Soft foam midsole', 'Supportive fit', 'Everyday versatility'], false),
  ('f2adbd42-a09e-4946-9492-838dc4a72208', 'Velocity Runner', 'Puma', 'shoes', 98, 125, '/img/shoe-puma-1.png', 'A flexible training shoe built for movement, warm-ups, and weekend miles.', array['Flexible construction', 'Lightweight upper', 'Grippy rubber outsole'], true),
  ('082bb5ef-017f-482a-a8af-11e294a6cf1d', 'Everyday Layer', 'Rongkushol', 'clothing', 54, 68, '/img/cloth-png-black1.png', 'A clean wardrobe essential with an easy fit and soft everyday feel.', array['Relaxed fit', 'Soft-touch fabric', 'Easy-care finish'], false),
  ('89390d56-3af8-4e07-82db-d8200156422a', 'Canvas Carryall', 'Rongkushol', 'bags', 72, null, '/img/handbag-png-green1.png', 'A practical daily bag that keeps your essentials close without weighing you down.', array['Roomy main compartment', 'Comfortable carry', 'Durable construction'], false)
on conflict (id) do nothing;

insert into public.offers
  (id, title, description, discount_percent, image_url, product_id)
values
  ('1cd197cf-d1b0-41e7-9c73-8114458f02bd', 'Move for less', 'A little extra on selected everyday trainers.', 20, '/img/shoe-offer-1.png', 'e6288576-c470-4c68-bdcf-96c829496ad1'),
  ('72098149-aaef-44c8-9df5-c1bcc2b312bc', 'Weekend rotation', 'Fresh pairs, better prices. While this offer lasts.', 15, '/img/shoe-offer-2.png', 'fc01d18f-073b-47d2-8f52-949e0b56d8e2')
on conflict (id) do nothing;
