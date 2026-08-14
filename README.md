# パン原価計算アプリ

原材料 → 生地 → パン → 製品 → 出荷・所要量 を一気通貫で計算するアプリです。

- 小麦粉A/B/Cのような**銘柄別の登録**と、生地での**ブレンド配合**
- **自家製フィリング**（あん・クリーム・クッキー生地など。入れ子対応）
- **3段構成**（生地 → パン → 製品）で、レシピを触らず値付けだけ調整できる
- **想定価格シミュレーター**（例：メロンパンを500円と入れると原価率が即表示）
- 出荷数から**必要なパン・生地・原材料・包材**を自動算出
- **Supabase接続で複数人がリアルタイムに同じデータを共有**

---

## セットアップ（全体で15分ほど）

### 1. Supabase を用意する（データ共有用・無料枠でOK）

1. https://supabase.com でプロジェクトを作成
2. 左メニューの **SQL Editor** を開き、`supabase/setup.sql` の中身を貼り付けて実行
3. **Project Settings → API** から次の2つをコピー
   - `Project URL`
   - `anon public` キー

### 2. GitHub に置く

```bash
cd bakery-app-github
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/bakery-cost-app.git
git push -u origin main
```

### 3. GitHub 側の設定（2か所）

- **Settings → Secrets and variables → Actions → New repository secret** で2つ登録
  - `VITE_SUPABASE_URL` … 手順1でコピーした Project URL
  - `VITE_SUPABASE_ANON_KEY` … 手順1でコピーした anon public キー
- **Settings → Pages → Source** を **GitHub Actions** に変更

これで push するたびに自動でビルド・公開されます。
公開URL: `https://あなたのユーザー名.github.io/bakery-cost-app/`

---

## 使い方

- 公開URLをスタッフにLINE等で共有すれば、スマホ・PCどちらでも使えます
- スマホはブラウザの「ホーム画面に追加」でアプリのように使えます
- 誰かが入力すると、他の人の画面にも**自動で反映**されます（リアルタイム同期）
- 画面右上に「共有データ」と出ていればSupabaseに接続できています
  （「この端末に保存」と出ている場合はSecretsの設定を確認してください）

最初に「データをサンプルに戻す」でサンプルを消してから、実際の数字を入れてください。

---

## ローカルで動かす場合

```bash
npm install
cp .env.example .env     # .env に Supabase の値を記入
npm run dev
```

`.env` を作らなくても起動します（その場合はこの端末のブラウザ保存になります）。

---

## セキュリティについて

現在は「URLを知っている人が使える」設定です（匿名キーでの読み書き許可）。
社内限定にしたい場合は Supabase Auth を有効にし、`supabase/setup.sql` のポリシーの
`anon` を `authenticated` に変更してログイン制にできます。

## 構成

```
src/App.jsx    アプリ本体（画面と原価計算ロジック）
src/store.js   データの保存先（Supabase／未設定時はブラウザ保存に自動フォールバック）
supabase/setup.sql   Supabaseに実行するSQL
.github/workflows/deploy.yml   push時に自動デプロイ
```

## 今後の拡張候補

- Google スプレッドシート連携（最終フェーズ）
- ログインによる権限管理、店舗別データ（`VITE_SHOP_ID` で分離可能）
