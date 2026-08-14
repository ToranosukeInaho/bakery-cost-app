/**
 * store.js — データの保存先
 * --------------------------------------------------------------
 * Supabase の環境変数が設定されていれば「全員で共有」モード、
 * 未設定ならこの端末のブラウザ保存（localStorage）にフォールバックします。
 * どちらの場合もアプリ側のコードは変わりません。
 */
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 共有モードかどうか（Supabase接続済みなら true） */
export const isShared = Boolean(URL && ANON);

const supabase = isShared ? createClient(URL, ANON) : null;

// 1店舗＝1レコードで全データを持つシンプル構成。複数店舗にするならここを分ける。
const ROW_ID = import.meta.env.VITE_SHOP_ID || "default";
const TABLE = "bakery_state";
const LOCAL_KEY = "bakery_cost_app:v4";

/** データ読み込み */
export async function loadData() {
  if (isShared) {
    const { data, error } = await supabase.from(TABLE).select("payload").eq("id", ROW_ID).maybeSingle();
    if (error) { console.error("load error", error); return null; }
    return data?.payload ?? null;
  }
  try { const v = localStorage.getItem(LOCAL_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

/** データ保存 */
export async function saveData(payload) {
  if (isShared) {
    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, payload, updated_at: new Date().toISOString() });
    if (error) { console.error("save error", error); return false; }
    return true;
  }
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); return true; } catch { return false; }
}

/**
 * 他の人の変更をリアルタイムで受け取る（共有モードのみ）。
 * 戻り値の関数を呼ぶと購読解除。
 */
export function subscribe(onChange) {
  if (!isShared) return () => {};
  const ch = supabase
    .channel("bakery_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `id=eq.${ROW_ID}` },
      (p) => { if (p.new?.payload) onChange(p.new.payload); })
    .subscribe();
  return () => supabase.removeChannel(ch);
}
