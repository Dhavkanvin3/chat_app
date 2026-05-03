# ChatApp 

A real-time chat app built with **React + Vite**, **Capacitor** (Android), and **Supabase** (Auth, Database, Realtime).
## Supabase Setup

### 1. Create a project
Go to [supabase.com](https://supabase.com) → New Project → give it any name.

### 2. Run this SQL
Go to **SQL Editor** in your Supabase dashboard and paste this:

```sql
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

alter table conversations disable row level security;
alter table conversation_participants disable row level security;
alter table messages disable row level security;
alter table profiles disable row level security;
```

### 3. Enable Realtime
Go to **Database → Replication** → enable replication for the `messages` table.

### 4. Create test users
Go to **Authentication → Users → Add User** and create two users:
- `user1@test.com` / `Test1234!`
- `user2@test.com` / `Test1234!`

### 5. Create a test conversation
Copy both user IDs from the Users list, then run this in SQL Editor:

```sql
insert into conversations (id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into conversation_participants (conversation_id, user_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PASTE_USER1_ID_HERE'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PASTE_USER2_ID_HERE');
```

### 6. Get your API keys
Go to **Project Settings → API** and copy:
- `Project URL`
- `anon / public` key

---

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/Dhavkanvin3/chatapp.git
cd chatapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env
```

Open `.env` and fill in your keys:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Log in as `user1@test.com` in one window and `user2@test.com` in an incognito window to test real-time messaging.

---

## Building the APK (Please note that since I cannot download Android studios I have used SDK tools for making the APK)

### Prerequisites
- Make sure to  install Java and make  `java -version` works in terminal
- Android SDK command-line tools — [download here](https://developer.android.com/studio#command-tools), unzip and set `ANDROID_HOME`

### Steps

```bash
# 1. Build the web app
npm run build

# 2. Add Android platform (first time only)
npx cap add android

# 3. Sync web assets to Android
npx cap sync

# 4. Build the APK
cd android

# Windows:
gradlew assembleDebug

# Mac / Linux:
./gradlew assembleDebug
```

### APK location

```
android/app/build/outputs/apk/app.apk
```

---

## Project Structure

```
src/
  lib/
    supabase.js        # Supabase client
  pages/
    Login.jsx          # Login screen
    ChatList.jsx       # Conversations list
    Chat.jsx           # Real-time chat screen
  App.jsx              # Routing
  main.jsx             # Entry point
  index.css            # All styles
.env.example           # Placeholder environment variables
capacitor.config.ts    # Capacitor configuration
```

---

## Features

- Email + password login via Supabase Auth
- Chat list showing all conversations and last message
- Real-time messaging using Supabase Realtime (Postgres changes)
- Sent messages on the right, received on the left
- Android APK via Capacitor

---

*Submitted by [Your Name] · Arham Fintech Pvt Ltd Intern Assessment*
