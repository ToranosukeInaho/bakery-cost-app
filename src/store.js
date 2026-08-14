/**
 * store.js — データの保存先とバックアップ
 * --------------------------------------------------------------
 * Supabase の環境変数が設定されていれば「全員で共有」モード、
 * 未設定ならこの端末のブラウザ保存（localStorage）にフォールバックします。
 */
import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 共有モードかどうか（Supabase接続済みなら true） */
export const isShared = Boolean(URL_ && ANON);

const supabase = isShared ? createClient(URL_, ANON) : null;

const ROW_ID = import.meta.env.VITE_SHOP_ID || "default";
const TABLE = "bakery_state";
const HIST_TABLE = "bakery_history";
const LOCAL_KEY = "bakery_cost_app:v4";
const LOCAL_HIST_KEY = "bakery_cost_app:history";
const MAX_LOCAL_HISTORY = 30;

/* ---------------- 本体データ ---------------- */

export async function loadData() {
  if (isShared) {
    const { data, error } = await supabase.from(TABLE).select("payload").eq("id", ROW_ID).maybeSingle();
    if (error) { console.error("load error", error); return null; }
    return data?.payload ?? null;
  }
  try { const v = localStorage.getItem(LOCAL_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

export async function saveData(payload) {
  if (isShared) {
    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, payload, updated_at: new Date().toISOString() });
    if (error) { console.error("save error", error); return false; }
    return true;
  }
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); return true; } catch { return false; }
}

export function subscribe(onChange) {
  if (!isShared) return () => {};
  const ch = supabase
    .channel("bakery_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `id=eq.${ROW_ID}` },
      (p) => { if (p.new?.payload) onChange(p.new.payload); })
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* ---------------- バックアップ（履歴） ---------------- */

/** 履歴を1件保存する */
export async function saveSnapshot(payload, label = "自動") {
  const at = new Date().toISOString();
  if (isShared) {
    const { error } = await supabase.from(HIST_TABLE).insert({ shop_id: ROW_ID, label, payload, created_at: at });
    if (error) { console.error("snapshot error", error); return false; }
    // 古い履歴の掃除（最新50件を残す）
    const { data } = await supabase.from(HIST_TABLE).select("id").eq("shop_id", ROW_ID)
      .order("created_at", { ascending: false }).range(50, 999);
    if (data && data.length) await supabase.from(HIST_TABLE).delete().in("id", data.map((r) => r.id));
    return true;
  }
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_HIST_KEY) || "[]");
    list.unshift({ id: at, label, payload, created_at: at });
    localStorage.setItem(LOCAL_HIST_KEY, JSON.stringify(list.slice(0, MAX_LOCAL_HISTORY)));
    return true;
  } catch { return false; }
}

/** 履歴の一覧（新しい順） */
export async function listSnapshots(limit = 50) {
  if (isShared) {
    const { data, error } = await supabase.from(HIST_TABLE)
      .select("id,label,created_at").eq("shop_id", ROW_ID)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) { console.error("history error", error); return []; }
    return data || [];
  }
  try { return JSON.parse(localStorage.getItem(LOCAL_HIST_KEY) || "[]").map(({ payload, ...m }) => m); }
  catch { return []; }
}

/** 履歴1件の中身を取り出す */
export async function getSnapshot(id) {
  if (isShared) {
    const { data, error } = await supabase.from(HIST_TABLE).select("payload").eq("id", id).maybeSingle();
    if (error) { console.error("restore error", error); return null; }
    return data?.payload ?? null;
  }
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_HIST_KEY) || "[]");
    return list.find((s) => s.id === id)?.payload ?? null;
  } catch { return null; }
}

/* ---------------- バックアップ（ファイル） ---------------- */

/** データをJSONファイルとしてダウンロード */
export function downloadBackup(payload) {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const name = `bakery_backup_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); window.URL.revokeObjectURL(url);
}

/** バックアップファイルを読み込む（中身の妥当性も確認） */
export async function readBackupFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  const need = ["materials", "packaging", "doughs", "fillings", "breads", "products"];
  const missing = need.filter((k) => !Array.isArray(data[k]));
  if (missing.length) throw new Error("このファイルはバックアップではないようです（不足: " + missing.join(", ") + "）");
  return data;
}
