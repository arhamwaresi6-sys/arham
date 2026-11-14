create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'customer',
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'customer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('customer', 'admin'));
  end if;
end;
$$;

create table if not exists public.admin_user_directory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

insert into public.profiles (user_id, display_name)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'display_name', ''),
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(raw_user_meta_data ->> 'name', ''),
    ''
  )
from auth.users
on conflict (user_id) do nothing;

update public.profiles as profile
set display_name = coalesce(
  nullif(auth_user.raw_user_meta_data ->> 'display_name', ''),
  nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
  nullif(auth_user.raw_user_meta_data ->> 'name', ''),
  profile.display_name
)
from auth.users as auth_user
where profile.user_id = auth_user.id
  and profile.display_name = '';

insert into public.admin_user_directory (user_id, email)
select id, email
from auth.users
where email is not null
on conflict (user_id) do update set email = excluded.email;

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
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    )
  )
  on conflict (user_id) do nothing;
  if new.email is not null then
    insert into public.admin_user_directory (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update set email = excluded.email;
  else
    delete from public.admin_user_directory where user_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.is_store_root()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower((select auth.jwt() ->> 'email')) = 'arhamwaresi6@gmail.com', false);
$$;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_store_root()
    or exists (
      select 1
      from public.profiles
      where user_id = (select auth.uid())
        and role = 'admin'
    );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role not in ('customer', 'admin') then
    raise exception 'Invalid profile role.';
  end if;
  if not public.is_store_root() then
    if tg_op = 'INSERT' and new.role <> 'customer' then
      raise exception 'Only the store root can assign administrator access.';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'Only the store root can change administrator access.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_role();

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_synced on auth.users;
create trigger on_auth_user_synced
  after insert or update on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.admin_user_directory enable row level security;

drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles"
  on public.profiles for select using (true);
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Root can update user roles" on public.profiles;
create policy "Root can update user roles"
  on public.profiles for update to authenticated
  using (public.is_store_root())
  with check (public.is_store_root());
drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select using (is_active);
drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products"
  on public.products for select to authenticated using (public.is_store_admin());
drop policy if exists "Admins can create products" on public.products;
create policy "Admins can create products"
  on public.products for insert to authenticated with check (public.is_store_admin());
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated using (public.is_store_admin());
drop policy if exists "Public can read active offers" on public.offers;
create policy "Public can read active offers"
  on public.offers for select using (is_active);
drop policy if exists "Admins can read all offers" on public.offers;
create policy "Admins can read all offers"
  on public.offers for select to authenticated using (public.is_store_admin());
drop policy if exists "Admins can create offers" on public.offers;
create policy "Admins can create offers"
  on public.offers for insert to authenticated with check (public.is_store_admin());
drop policy if exists "Admins can update offers" on public.offers;
create policy "Admins can update offers"
  on public.offers for update to authenticated
  using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Admins can delete offers" on public.offers;
create policy "Admins can delete offers"
  on public.offers for delete to authenticated using (public.is_store_admin());
drop policy if exists "Root can read user directory" on public.admin_user_directory;
create policy "Root can read user directory"
  on public.admin_user_directory for select to authenticated using (public.is_store_root());
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
grant insert, update, delete on public.products, public.offers to authenticated;
grant select on public.admin_user_directory to authenticated;
revoke all on public.admin_user_directory from anon;
grant execute on function public.is_store_root() to anon, authenticated;
grant execute on function public.is_store_admin() to anon, authenticated;

insert into public.products
  (id, name, brand, category, price, compare_at_price, image_url, description, features, is_featured)
values
  ('e6288576-c470-4c68-bdcf-96c829496ad1', 'Air Motion 01', 'Nike', 'shoes', 129, 159, '/img/shoe-Nike-1.png', 'A lightweight everyday runner with a responsive feel and a clean, versatile profile.', array['Responsive cushioning', 'Breathable mesh', 'Rubber grip outsole'], true),
  ('fc01d18f-073b-47d2-8f52-949e0b56d8e2', 'Court Legacy', 'Jordan', 'shoes', 145, 180, '/img/shoe-jordan-1.png', 'A court-inspired classic, updated for all-day comfort and easy styling.', array['Padded collar', 'Durable leather upper', 'Classic court traction'], true),
  ('3903cf12-8d75-47b6-a27f-c45d5810687f', 'Street Form', 'New Balance', 'shoes', 110, null, '/img/shoe-newBalance-1.png', 'Modern everyday comfort with a balanced, soft ride from the first step.', array['Soft foam midsole', 'Supportive fit', 'Everyday versatility'], false),
  ('f2adbd42-a09e-4946-9492-838dc4a72208', 'Velocity Runner', 'Puma', 'shoes', 98, 125, '/img/shoe-puma-1.png', 'A flexible training shoe built for movement, warm-ups, and weekend miles.', array['Flexible construction', 'Lightweight upper', 'Grippy rubber outsole'], true),
  ('082bb5ef-017f-482a-a8af-11e294a6cf1d', 'Everyday Layer', 'Rongkushol', 'clothing', 54, 68, '/img/cloth-png-black1.png', 'A clean wardrobe essential with an easy fit and soft everyday feel.', array['Relaxed fit', 'Soft-touch fabric', 'Easy-care finish'], false),
  ('89390d56-3af8-4e07-82db-d8200156422a', 'Canvas Carryall', 'Rongkushol', 'bags', 72, null, '/img/handbag-png-green1.png', 'A practical daily bag that keeps your essentials close without weighing you down.', array['Roomy main compartment', 'Comfortable carry', 'Durable construction'], false),
  ('6ab36b3c-3a93-41d0-8d38-7bb22f0e3001', 'Cloudstep Runner', 'Nike', 'shoes', 118, 145, '/img/shoe-Nike-2.png', 'A cushioned daily trainer for commutes, errands, and easy miles.', array['Soft impact cushioning', 'Breathable upper', 'Flexible everyday sole'], true),
  ('6ab36b3c-3a93-41d0-8d38-7bb22f0e3002', 'Retro Court Low', 'Jordan', 'shoes', 132, 160, '/img/shoe-jordan-2.png', 'A timeless low-profile court shoe with a comfortable, broken-in feel.', array['Padded ankle collar', 'Classic court profile', 'Grippy rubber outsole'], false),
  ('6ab36b3c-3a93-41d0-8d38-7bb22f0e3003', 'Everyday Tote', 'Rongkushol', 'bags', 64, null, '/img/handbag-png-pink1.png', 'A roomy lightweight tote for the daily essentials and everything in between.', array['Easy shoulder carry', 'Roomy interior', 'Lightweight construction'], false),
  ('6ab36b3c-3a93-41d0-8d38-7bb22f0e3004', 'Soft Knit Layer', 'Rongkushol', 'clothing', 48, 60, '/img/cloth-png-green1.png', 'An easy layer with a relaxed shape and a soft, breathable hand feel.', array['Relaxed everyday fit', 'Soft breathable fabric', 'Easy to layer'], false)
on conflict (id) do nothing;

insert into public.offers
  (id, title, description, discount_percent, image_url, product_id)
values
  ('1cd197cf-d1b0-41e7-9c73-8114458f02bd', 'Move for less', 'A little extra on selected everyday trainers.', 20, '/img/shoe-offer-1.png', 'e6288576-c470-4c68-bdcf-96c829496ad1'),
  ('72098149-aaef-44c8-9df5-c1bcc2b312bc', 'Weekend rotation', 'Fresh pairs, better prices. While this offer lasts.', 15, '/img/shoe-offer-2.png', 'fc01d18f-073b-47d2-8f52-949e0b56d8e2'),
  ('2cd197cf-d1b0-41e7-9c73-8114458f0003', 'Everyday runner event', 'Save on the pairs made to keep you moving.', 18, '/img/shoe-offer-3.png', '6ab36b3c-3a93-41d0-8d38-7bb22f0e3001'),
  ('2cd197cf-d1b0-41e7-9c73-8114458f0004', 'A softer layer', 'A little something off your everyday essentials.', 12, '/img/cloth-png-green1.png', '6ab36b3c-3a93-41d0-8d38-7bb22f0e3004')
on conflict (id) do nothing;
