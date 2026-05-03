# CHATAPP
This is a realtime chat app made on react.js vite , supabase and capacitor
1 ) Supabase Setup :
  1. Create a project
    Go to supabase.com → New Project → give it any name.
  2. Run this SQL
    Go to SQL Editor in your Supabase dashboard and paste this:

      create table conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now()
);

create table conversation_participants (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  unique(conversation_id, user_id)
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  username text
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();



alter table messages disable row level security;
alter table profiles disable row level security;
