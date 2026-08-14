-- Supabase の SQL Editor にこのまま貼り付けて実行してください。
-- アプリの全データ（原材料・生地・パン・製品・出荷）を1行のJSONで保持します。

create table if not exists public.bakery_state (
  id         text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bakery_state enable row level security;

-- 匿名キーで読み書きを許可（URLを知っている人が使える運用）
-- ※ ログイン制にしたい場合は Supabase Auth を有効にし、
--    下記ポリシーの `anon` を `authenticated` に変えてください。
drop policy if exists "anon read"  on public.bakery_state;
drop policy if exists "anon write" on public.bakery_state;
drop policy if exists "anon update" on public.bakery_state;

create policy "anon read"   on public.bakery_state for select to anon using (true);
create policy "anon write"  on public.bakery_state for insert to anon with check (true);
create policy "anon update" on public.bakery_state for update to anon using (true) with check (true);

-- 他の人の変更をリアルタイムで受け取るための設定
alter publication supabase_realtime add table public.bakery_state;
