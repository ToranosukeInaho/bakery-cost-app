import { useState, useEffect, useRef } from "react";
import {
  Wheat, Package, Layers, ShoppingBag, ClipboardList, ChefHat, Croissant,
  Percent, Info, ArrowRight, Plus, Trash2, Check, Loader2, AlertTriangle, Calculator, Users,
} from "lucide-react";

import { loadData, saveData, subscribe, isShared } from "./store.js";

/* ---------- helpers ---------- */
const yen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const yen2 = (n) => "¥" + (n || 0).toFixed(2);
const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) : "—") + "%";
const kg = (g) => (g / 1000).toFixed(2);
const round10 = (n) => Math.round(n / 10) * 10;
const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 8);

const hasStore = true;

/* ---------- seed data ----------
   小麦粉・バターなどは銘柄ごとに行で登録（A/B/C…いくつでも追加可）。
   生地では複数銘柄をブレンド配合できる。 */
const seedMaterials = [
  { id: "m_flourA", name: "小麦粉A（強力・春よ恋）", unit: "kg", price: 280 },
  { id: "m_flourB", name: "小麦粉B（強力・キタノカオリ）", unit: "kg", price: 340 },
  { id: "m_flourC", name: "小麦粉C（薄力）", unit: "kg", price: 250 },
  { id: "m_butterA", name: "バターA（無塩）", unit: "kg", price: 1800 },
  { id: "m_butterB", name: "バターB（発酵）", unit: "kg", price: 2400 },
  { id: "m_sugar", name: "砂糖", unit: "kg", price: 200 },
  { id: "m_salt", name: "塩", unit: "kg", price: 150 },
  { id: "m_yeast", name: "ドライイースト", unit: "kg", price: 2500 },
  { id: "m_milk", name: "牛乳", unit: "kg", price: 200 },
  { id: "m_egg", name: "卵", unit: "kg", price: 350 },
  { id: "m_water", name: "水", unit: "kg", price: 1 },
  { id: "m_azuki", name: "小豆", unit: "kg", price: 700 },
  { id: "m_cream", name: "生クリーム", unit: "kg", price: 1200 },
  { id: "m_choco", name: "チョコチップ", unit: "kg", price: 1200 },
];
const seedPackaging = [
  { id: "p_shoku", name: "食パン袋", price: 8 },
  { id: "p_kashi", name: "菓子パン袋", price: 4 },
  { id: "p_set", name: "セット袋（大）", price: 12 },
  { id: "p_seal", name: "シール", price: 1 },
];
const seedDoughs = [
  { id: "d_shoku", name: "食パン生地", ingredients: [
    { materialId: "m_flourA", grams: 700 }, { materialId: "m_flourB", grams: 300 },
    { materialId: "m_sugar", grams: 60 }, { materialId: "m_salt", grams: 18 },
    { materialId: "m_butterA", grams: 50 }, { materialId: "m_yeast", grams: 12 },
    { materialId: "m_milk", grams: 200 }, { materialId: "m_water", grams: 480 } ] },
  { id: "d_kashi", name: "菓子パン生地", ingredients: [
    { materialId: "m_flourA", grams: 800 }, { materialId: "m_flourC", grams: 200 },
    { materialId: "m_sugar", grams: 150 }, { materialId: "m_salt", grams: 12 },
    { materialId: "m_butterA", grams: 120 }, { materialId: "m_yeast", grams: 14 },
    { materialId: "m_egg", grams: 100 }, { materialId: "m_milk", grams: 300 } ] },
  { id: "d_baguette", name: "バゲット生地", ingredients: [
    { materialId: "m_flourB", grams: 1000 }, { materialId: "m_salt", grams: 20 },
    { materialId: "m_yeast", grams: 4 }, { materialId: "m_water", grams: 700 } ] },
];
const seedFillings = [
  { id: "f_anko", name: "自家製こしあん", components: [
    { kind: "material", refId: "m_azuki", grams: 500 }, { kind: "material", refId: "m_sugar", grams: 450 }, { kind: "material", refId: "m_salt", grams: 3 } ] },
  { id: "f_custard", name: "自家製カスタード", components: [
    { kind: "material", refId: "m_milk", grams: 500 }, { kind: "material", refId: "m_egg", grams: 100 }, { kind: "material", refId: "m_sugar", grams: 120 }, { kind: "material", refId: "m_flourC", grams: 45 } ] },
  { id: "f_diplomat", name: "自家製ディプロマットクリーム", components: [
    { kind: "filling", refId: "f_custard", grams: 300 }, { kind: "material", refId: "m_cream", grams: 200 } ] },
  { id: "f_cookie", name: "メロンパン用クッキー生地", components: [
    { kind: "material", refId: "m_flourC", grams: 200 }, { kind: "material", refId: "m_butterB", grams: 100 }, { kind: "material", refId: "m_sugar", grams: 100 }, { kind: "material", refId: "m_egg", grams: 50 } ] },
];
/* パン＝レシピ（生地＋具材）。価格や包材は持たない */
const seedBreads = [
  { id: "b_shoku", name: "食パン（1.5斤）", doughId: "d_shoku", doughG: 510, fillings: [] },
  { id: "b_anpan", name: "あんぱん", doughId: "d_kashi", doughG: 50, fillings: [{ kind: "filling", refId: "f_anko", grams: 40 }] },
  { id: "b_cream", name: "クリームパン", doughId: "d_kashi", doughG: 50, fillings: [{ kind: "filling", refId: "f_custard", grams: 40 }] },
  { id: "b_melon", name: "メロンパン", doughId: "d_kashi", doughG: 50, fillings: [{ kind: "filling", refId: "f_cookie", grams: 30 }] },
  { id: "b_nama", name: "生クリームパン", doughId: "d_kashi", doughG: 50, fillings: [{ kind: "filling", refId: "f_diplomat", grams: 45 }] },
  { id: "b_baguette", name: "バゲット", doughId: "d_baguette", doughG: 280, fillings: [] },
];
/* 製品＝売り物（パン×個数＋包材＋販売価格）。原価率・シミュレーションはここ */
const seedProducts = [
  { id: "prd_shoku", name: "食パン（1.5斤）", items: [{ breadId: "b_shoku", count: 1 }], packaging: ["p_shoku"], price: 540, simPrice: 540 },
  { id: "prd_anpan", name: "あんぱん（単品）", items: [{ breadId: "b_anpan", count: 1 }], packaging: ["p_kashi"], price: 190, simPrice: 190 },
  { id: "prd_anpan3", name: "あんぱん 3個セット", items: [{ breadId: "b_anpan", count: 3 }], packaging: ["p_set", "p_seal"], price: 540, simPrice: 540 },
  { id: "prd_cream", name: "クリームパン", items: [{ breadId: "b_cream", count: 1 }], packaging: ["p_kashi"], price: 190, simPrice: 190 },
  { id: "prd_melon", name: "メロンパン", items: [{ breadId: "b_melon", count: 1 }], packaging: ["p_kashi"], price: 250, simPrice: 500 },
  { id: "prd_nama", name: "生クリームパン", items: [{ breadId: "b_nama", count: 1 }], packaging: ["p_kashi"], price: 220, simPrice: 220 },
  { id: "prd_baguette", name: "バゲット", items: [{ breadId: "b_baguette", count: 1 }], packaging: [], price: 240, simPrice: 240 },
];
const seedShipment = { prd_shoku: 30, prd_anpan: 40, prd_anpan3: 10, prd_cream: 30, prd_melon: 25, prd_nama: 20, prd_baguette: 15 };

/* ---------- small components ---------- */
const Card = ({ children, className = "" }) => (
  <div className={"rounded-2xl bg-white border border-stone-200 shadow-sm " + className}>{children}</div>
);
const Num = ({ children, className = "" }) => <span className={"font-mono tabular-nums " + className}>{children}</span>;
const StatBox = ({ label, value, sub, tone = "stone" }) => {
  const tones = { stone: "bg-stone-50 text-stone-900 border-stone-200", amber: "bg-amber-50 text-amber-900 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200", rose: "bg-rose-50 text-rose-900 border-rose-200" };
  return (
    <div className={"rounded-xl border px-4 py-3 " + tones[tone]}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-mono tabular-nums font-semibold leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
    </div>
  );
};
const RateBadge = ({ rate, target }) => {
  let tone = "bg-emerald-100 text-emerald-700";
  if (rate > target + 0.05) tone = "bg-rose-100 text-rose-700"; else if (rate > target + 0.005) tone = "bg-amber-100 text-amber-700";
  return <span className={"rounded-md px-2 py-0.5 text-sm font-mono tabular-nums font-semibold " + tone}>{pct(rate)}</span>;
};
const NumInput = ({ value, onChange, suffix, w = "w-24" }) => (
  <span className="inline-flex items-center gap-1">
    <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
      className={w + " rounded-lg border border-stone-300 bg-white px-2 py-1 text-right font-mono tabular-nums text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"} />
    {suffix && <span className="text-xs text-stone-400">{suffix}</span>}
  </span>
);
const TextInput = ({ value, onChange, placeholder, className = "" }) => (
  <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
    className={"rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 " + className} />
);
const Trash = ({ onClick, disabled, title }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    className={"rounded-lg p-1.5 " + (disabled ? "text-stone-200 cursor-not-allowed" : "text-stone-400 hover:bg-rose-50 hover:text-rose-500")}>
    <Trash2 size={15} />
  </button>
);
const AddButton = ({ onClick, children }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-medium text-stone-500 hover:border-amber-400 hover:text-amber-600">
    <Plus size={16} /> {children}
  </button>
);

/* ============ main ============ */
export default function BakeryCostApp() {
  const [tab, setTab] = useState("products");
  const [status, setStatus] = useState("loading");
  const [saveState, setSaveState] = useState("idle");

  const [materials, setMaterials] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [doughs, setDoughs] = useState([]);
  const [fillings, setFillings] = useState([]);
  const [breads, setBreads] = useState([]);
  const [products, setProducts] = useState([]);
  const [shipment, setShipment] = useState({});
  const [targetRate, setTargetRate] = useState(0.25);

  const isPostLoad = useRef(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const applyState = (d) => {
        setMaterials(d.materials || seedMaterials); setPackaging(d.packaging || seedPackaging);
        setDoughs(d.doughs || seedDoughs); setFillings(d.fillings || seedFillings);
        setBreads(d.breads || seedBreads); setProducts(d.products || seedProducts);
        setShipment(d.shipment || {}); setTargetRate(typeof d.targetRate === "number" ? d.targetRate : 0.25);
      };
      let d = await loadData();
      if (d) {
        applyState(d);
      } else {
        setMaterials(seedMaterials); setPackaging(seedPackaging); setDoughs(seedDoughs); setFillings(seedFillings);
        setBreads(seedBreads); setProducts(seedProducts); setShipment(seedShipment); setTargetRate(0.25);
        await saveData({ materials: seedMaterials, packaging: seedPackaging, doughs: seedDoughs, fillings: seedFillings, breads: seedBreads, products: seedProducts, shipment: seedShipment, targetRate: 0.25 });
      }
      setStatus("ready");

      // 他の人の変更をリアルタイムで反映（共有モードのみ）
      unsub = subscribe((payload) => {
        if (saveTimer.current) return; // 自分が編集中は上書きしない
        isPostLoad.current = true;
        applyState(payload);
      });
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (isPostLoad.current) { isPostLoad.current = false; return; }
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveData({ materials, packaging, doughs, fillings, breads, products, shipment, targetRate });
      saveTimer.current = null;
      setSaveState(ok ? "saved" : "idle");
    }, 700);
  }, [materials, packaging, doughs, fillings, breads, products, shipment, targetRate, status]);

  /* ---- lookups ---- */
  const matById = (id) => materials.find((m) => m.id === id);
  const pkgById = (id) => packaging.find((p) => p.id === id);
  const doughById = (id) => doughs.find((d) => d.id === id);
  const fillById = (id) => fillings.find((f) => f.id === id);
  const breadById = (id) => breads.find((b) => b.id === id);

  /* ---- calc: dough ---- */
  const doughWeight = (d) => d.ingredients.reduce((s, i) => s + i.grams, 0);
  const doughCost = (d) => d.ingredients.reduce((s, i) => s + (i.grams / 1000) * (matById(i.materialId)?.price || 0), 0);
  const doughCostPerG = (d) => { const w = doughWeight(d); return w > 0 ? doughCost(d) / w : 0; };

  /* ---- calc: filling（再帰・循環ガード） ---- */
  const fillingCalc = (id, stack = new Set()) => {
    const f = fillById(id);
    if (!f) return { grams: 0, cost: 0, cycle: false };
    if (stack.has(id)) return { grams: 0, cost: 0, cycle: true };
    stack.add(id);
    let grams = 0, cost = 0, cycle = false;
    f.components.forEach((c) => {
      grams += c.grams;
      if (c.kind === "material") cost += (c.grams / 1000) * (matById(c.refId)?.price || 0);
      else { const sub = fillingCalc(c.refId, stack); if (sub.cycle) cycle = true; const pg = sub.grams > 0 ? sub.cost / sub.grams : 0; cost += pg * c.grams; }
    });
    stack.delete(id);
    return { grams, cost, cycle };
  };
  const fillingPerG = (id) => { const r = fillingCalc(id); return r.grams > 0 ? r.cost / r.grams : 0; };
  const compName = (c) => c.kind === "material" ? (matById(c.refId)?.name || "（削除済み）") : (fillById(c.refId)?.name || "（削除済み）");
  const compCost = (c) => c.kind === "material" ? (c.grams / 1000) * (matById(c.refId)?.price || 0) : fillingPerG(c.refId) * c.grams;
  const dependsOn = (aId, bId, stack = new Set()) => {
    if (aId === bId) return true; if (stack.has(aId)) return false;
    const f = fillById(aId); if (!f) return false; stack.add(aId);
    for (const c of f.components) if (c.kind === "filling" && (c.refId === bId || dependsOn(c.refId, bId, stack))) return true;
    stack.delete(aId); return false;
  };

  /* ---- calc: bread（パン1個＝生地＋具材） ---- */
  const breadCalc = (b) => {
    const d = doughById(b.doughId);
    const doughPart = (d ? doughCostPerG(d) : 0) * b.doughG;
    const fillingPart = b.fillings.reduce((s, c) => s + compCost(c), 0);
    return { doughPart, fillingPart, total: doughPart + fillingPart, doughName: d?.name || "（生地未設定）" };
  };

  /* ---- calc: product（製品＝パン×個数＋包材） ---- */
  const productCalc = (p) => {
    const breadPart = (p.items || []).reduce((s, it) => s + breadCalc(breadById(it.breadId) || { doughId: "", doughG: 0, fillings: [] }).total * (it.count || 0), 0);
    const pkgPart = (p.packaging || []).reduce((s, id) => s + (pkgById(id)?.price || 0), 0);
    const total = breadPart + pkgPart;
    const suggested = targetRate > 0 ? round10(total / targetRate) : 0;
    const rate = p.price > 0 ? total / p.price : Infinity;
    const simRate = p.simPrice > 0 ? total / p.simPrice : Infinity;
    return { breadPart, pkgPart, total, suggested, rate, simRate };
  };

  /* ---- shipment aggregation（製品→パン→生地/自家製→原材料） ---- */
  const breadNeeds = {}, doughNeeds = {}, fillingNeeds = {}, matNeeds = {}, pkgNeeds = {};
  let dayCost = 0, dayRevenue = 0;
  const addFillingDemand = (id, grams, stack = new Set()) => {
    if (stack.has(id)) return;
    fillingNeeds[id] = (fillingNeeds[id] || 0) + grams;
    const f = fillById(id); if (!f) return;
    const w = f.components.reduce((s, c) => s + c.grams, 0); if (w <= 0) return;
    const sc = grams / w; stack.add(id);
    f.components.forEach((c) => { if (c.kind === "filling") addFillingDemand(c.refId, sc * c.grams, stack); });
    stack.delete(id);
  };
  products.forEach((p) => {
    const qty = shipment[p.id] || 0; const c = productCalc(p);
    dayCost += c.total * qty; dayRevenue += (p.price || 0) * qty;
    if (qty <= 0) return;
    (p.items || []).forEach((it) => { breadNeeds[it.breadId] = (breadNeeds[it.breadId] || 0) + qty * (it.count || 0); });
    (p.packaging || []).forEach((id) => { pkgNeeds[id] = (pkgNeeds[id] || 0) + qty; });
  });
  Object.entries(breadNeeds).forEach(([bId, n]) => {
    const b = breadById(bId); if (!b) return;
    if (b.doughId) doughNeeds[b.doughId] = (doughNeeds[b.doughId] || 0) + n * b.doughG;
    b.fillings.forEach((c) => {
      if (c.kind === "filling") addFillingDemand(c.refId, n * c.grams);
      else matNeeds[c.refId] = (matNeeds[c.refId] || 0) + n * c.grams;
    });
  });
  Object.entries(doughNeeds).forEach(([dId, grams]) => {
    const d = doughById(dId); if (!d) return; const w = doughWeight(d); if (w <= 0) return; const s = grams / w;
    d.ingredients.forEach((i) => { matNeeds[i.materialId] = (matNeeds[i.materialId] || 0) + s * i.grams; });
  });
  Object.entries(fillingNeeds).forEach(([fid, grams]) => {
    const f = fillById(fid); if (!f) return; const w = f.components.reduce((s, c) => s + c.grams, 0); if (w <= 0) return; const s = grams / w;
    f.components.forEach((c) => { if (c.kind === "material") matNeeds[c.refId] = (matNeeds[c.refId] || 0) + s * c.grams; });
  });
  const dayProfit = dayRevenue - dayCost;
  const dayRate = dayRevenue > 0 ? dayCost / dayRevenue : 0;
  const totalMatCost = Object.entries(matNeeds).reduce((s, [id, g]) => s + (g / 1000) * (matById(id)?.price || 0), 0);
  const hasNeeds = Object.keys(breadNeeds).length > 0;

  /* ---- in-use ---- */
  const matInUse = (id) => doughs.some((d) => d.ingredients.some((i) => i.materialId === id))
    || fillings.some((f) => f.components.some((c) => c.kind === "material" && c.refId === id))
    || breads.some((b) => b.fillings.some((c) => c.kind === "material" && c.refId === id));
  const fillInUse = (id) => breads.some((b) => b.fillings.some((c) => c.kind === "filling" && c.refId === id))
    || fillings.some((f) => f.id !== id && f.components.some((c) => c.kind === "filling" && c.refId === id));
  const pkgInUse = (id) => products.some((p) => (p.packaging || []).includes(id));
  const doughInUse = (id) => breads.some((b) => b.doughId === id);
  const breadInUse = (id) => products.some((p) => (p.items || []).some((it) => it.breadId === id));

  /* ---- updaters ---- */
  const setMat = (id, patch) => setMaterials((xs) => xs.map((m) => m.id === id ? { ...m, ...patch } : m));
  const addMat = () => setMaterials((xs) => [...xs, { id: uid("m"), name: "新しい原材料", unit: "kg", price: 0 }]);
  const delMat = (id) => setMaterials((xs) => xs.filter((m) => m.id !== id));
  const setPkg = (id, patch) => setPackaging((xs) => xs.map((p) => p.id === id ? { ...p, ...patch } : p));
  const addPkg = () => setPackaging((xs) => [...xs, { id: uid("p"), name: "新しい包材", price: 0 }]);
  const delPkg = (id) => setPackaging((xs) => xs.filter((p) => p.id !== id));

  const setDough = (id, patch) => setDoughs((xs) => xs.map((d) => d.id === id ? { ...d, ...patch } : d));
  const addDough = () => setDoughs((xs) => [...xs, { id: uid("d"), name: "新しい生地", ingredients: [] }]);
  const delDough = (id) => setDoughs((xs) => xs.filter((d) => d.id !== id));
  const setDoughGram = (dId, mId, v) => setDoughs((xs) => xs.map((d) => d.id !== dId ? d : { ...d, ingredients: d.ingredients.map((i) => i.materialId === mId ? { ...i, grams: v } : i) }));
  const addDoughIng = (dId, mId) => setDoughs((xs) => xs.map((d) => d.id !== dId ? d : { ...d, ingredients: [...d.ingredients, { materialId: mId, grams: 100 }] }));
  const delDoughIng = (dId, mId) => setDoughs((xs) => xs.map((d) => d.id !== dId ? d : { ...d, ingredients: d.ingredients.filter((i) => i.materialId !== mId) }));

  const setFill = (id, patch) => setFillings((xs) => xs.map((f) => f.id === id ? { ...f, ...patch } : f));
  const addFill = () => setFillings((xs) => [...xs, { id: uid("f"), name: "新しい自家製パーツ", components: [] }]);
  const delFill = (id) => setFillings((xs) => xs.filter((f) => f.id !== id));
  const addFillComp = (fId, kind, refId) => setFillings((xs) => xs.map((f) => f.id !== fId ? f : { ...f, components: [...f.components, { kind, refId, grams: kind === "filling" ? 50 : 100 }] }));
  const delFillComp = (fId, kind, refId) => setFillings((xs) => xs.map((f) => f.id !== fId ? f : { ...f, components: f.components.filter((c) => !(c.kind === kind && c.refId === refId)) }));
  const setFillCompGram = (fId, kind, refId, v) => setFillings((xs) => xs.map((f) => f.id !== fId ? f : { ...f, components: f.components.map((c) => c.kind === kind && c.refId === refId ? { ...c, grams: v } : c) }));

  const setBread = (id, patch) => setBreads((xs) => xs.map((b) => b.id === id ? { ...b, ...patch } : b));
  const addBread = () => setBreads((xs) => [...xs, { id: uid("b"), name: "新しいパン", doughId: doughs[0]?.id || "", doughG: 50, fillings: [] }]);
  const delBread = (id) => setBreads((xs) => xs.filter((b) => b.id !== id));
  const addBreadComp = (bId, kind, refId) => setBreads((xs) => xs.map((b) => b.id !== bId ? b : { ...b, fillings: [...b.fillings, { kind, refId, grams: 30 }] }));
  const delBreadComp = (bId, kind, refId) => setBreads((xs) => xs.map((b) => b.id !== bId ? b : { ...b, fillings: b.fillings.filter((c) => !(c.kind === kind && c.refId === refId)) }));
  const setBreadCompGram = (bId, kind, refId, v) => setBreads((xs) => xs.map((b) => b.id !== bId ? b : { ...b, fillings: b.fillings.map((c) => c.kind === kind && c.refId === refId ? { ...c, grams: v } : c) }));

  const setProd = (id, patch) => setProducts((xs) => xs.map((p) => p.id === id ? { ...p, ...patch } : p));
  const addProd = () => setProducts((xs) => [...xs, { id: uid("prd"), name: "新しい製品", items: breads[0] ? [{ breadId: breads[0].id, count: 1 }] : [], packaging: [], price: 0, simPrice: 0 }]);
  const delProd = (id) => setProducts((xs) => xs.filter((p) => p.id !== id));
  const addProdItem = (pId, breadId) => setProducts((xs) => xs.map((p) => p.id !== pId ? p : { ...p, items: [...(p.items || []), { breadId, count: 1 }] }));
  const delProdItem = (pId, breadId) => setProducts((xs) => xs.map((p) => p.id !== pId ? p : { ...p, items: p.items.filter((it) => it.breadId !== breadId) }));
  const setProdItemCount = (pId, breadId, v) => setProducts((xs) => xs.map((p) => p.id !== pId ? p : { ...p, items: p.items.map((it) => it.breadId === breadId ? { ...it, count: v } : it) }));
  const toggleProdPkg = (pId, pkId) => setProducts((xs) => xs.map((p) => p.id !== pId ? p : { ...p, packaging: (p.packaging || []).includes(pkId) ? p.packaging.filter((x) => x !== pkId) : [...(p.packaging || []), pkId] }));
  const setQty = (pId, v) => setShipment((s) => ({ ...s, [pId]: v }));

  const resetAll = async () => {
    if (!window.confirm("登録した内容をすべて消して、最初のサンプルに戻します。よろしいですか？")) return;
    setMaterials(seedMaterials); setPackaging(seedPackaging); setDoughs(seedDoughs); setFillings(seedFillings);
    setBreads(seedBreads); setProducts(seedProducts); setShipment(seedShipment); setTargetRate(0.25);
    await saveData({ materials: seedMaterials, packaging: seedPackaging, doughs: seedDoughs, fillings: seedFillings, breads: seedBreads, products: seedProducts, shipment: seedShipment, targetRate: 0.25 });
  };

  const compSelect = (existing, selfId, onPick, label) => {
    const has = (k, id) => existing.some((e) => e.kind === k && e.refId === id);
    const mats = materials.filter((m) => !has("material", m.id));
    const fils = fillings.filter((f) => f.id !== selfId && !has("filling", f.id) && !(selfId && dependsOn(f.id, selfId)));
    return (
      <select value="" onChange={(e) => { const v = e.target.value; if (!v) return; const i = v.indexOf(":"); onPick(v.slice(0, i), v.slice(i + 1)); }}
        className="rounded-lg border border-dashed border-stone-300 px-2 py-1.5 text-sm text-stone-500 focus:border-amber-400 focus:outline-none">
        <option value="">{label}</option>
        {fils.length > 0 && <optgroup label="自家製パーツ">{fils.map((f) => <option key={f.id} value={"filling:" + f.id}>{f.name}</option>)}</optgroup>}
        {mats.length > 0 && <optgroup label="仕入れ材料">{mats.map((m) => <option key={m.id} value={"material:" + m.id}>{m.name}</option>)}</optgroup>}
      </select>
    );
  };

  const tabs = [
    { id: "materials", label: "原材料", icon: Wheat },
    { id: "packaging", label: "包材", icon: Package },
    { id: "doughs", label: "生地", icon: Layers },
    { id: "fillings", label: "自家製フィリング", icon: ChefHat },
    { id: "breads", label: "パン", icon: Croissant },
    { id: "products", label: "製品", icon: ShoppingBag },
    { id: "shipment", label: "出荷・所要量", icon: ClipboardList },
  ];

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500"><Loader2 className="mr-2 animate-spin" size={18} /> 読み込み中…</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white"><Wheat size={20} /></div>
            <div>
              <h1 className="text-lg font-bold leading-tight">パン原価計算</h1>
              <p className="text-xs text-stone-500">原材料 → 生地 → パン → 製品 → 出荷</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            {isShared
              ? <span className="flex items-center gap-1 text-emerald-600" title="全員で同じデータを共有しています"><Users size={12} />共有データ</span>
              : <span className="flex items-center gap-1" title="この端末のブラウザに保存されます（Supabase未接続）"><Users size={12} />この端末に保存</span>}
            {saveState === "saving" ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" />保存中…</span> :
              saveState === "saved" ? <span className="flex items-center gap-1 text-emerald-600"><Check size={12} />保存済み</span> :
              <span className="flex items-center gap-1"><Check size={12} />自動保存</span>}
          </div>
        </div>
        <div className="mx-auto max-w-5xl overflow-x-auto px-2">
          <div className="flex gap-1 pb-2">
            {tabs.map((t) => {
              const Icon = t.icon; const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={"flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " + (active ? "bg-amber-500 text-white" : "text-stone-600 hover:bg-stone-100")}>
                  <Icon size={16} />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">

        {/* ===== 原材料 ===== */}
        {tab === "materials" && (
          <>
            <p className="text-sm text-stone-500">
              仕入れ単価（円/kg）を手入力で登録します。<b>同じ種類でも銘柄ごとに行を分けて登録</b>できます（例：小麦粉A・B・C、バターA・B）。生地では複数銘柄をブレンド配合できます。
            </p>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead><tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-4 py-3 font-medium">原材料名（銘柄）</th><th className="px-4 py-3 font-medium">単位</th><th className="px-4 py-3 text-right font-medium">単価（円 / 単位）</th><th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5"><TextInput value={m.name} onChange={(v) => setMat(m.id, { name: v })} className="w-64" /></td>
                      <td className="px-4 py-2.5"><TextInput value={m.unit} onChange={(v) => setMat(m.id, { unit: v })} className="w-14" /></td>
                      <td className="px-4 py-2.5 text-right"><NumInput value={m.price} onChange={(v) => setMat(m.id, { price: v })} suffix="円" /></td>
                      <td className="px-4 py-2.5 text-right"><Trash onClick={() => delMat(m.id)} disabled={matInUse(m.id)} title={matInUse(m.id) ? "生地・自家製・パンで使用中のため削除できません" : "削除"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <AddButton onClick={addMat}>原材料（銘柄）を追加</AddButton>
          </>
        )}

        {/* ===== 包材 ===== */}
        {tab === "packaging" && (
          <>
            <p className="text-sm text-stone-500">袋・シールなどを1枚あたりの単価で登録します。製品ごとに使う包材が原価に加算されます。</p>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead><tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-4 py-3 font-medium">包材名</th><th className="px-4 py-3 text-right font-medium">単価（円 / 枚）</th><th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {packaging.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5"><TextInput value={p.name} onChange={(v) => setPkg(p.id, { name: v })} className="w-44" /></td>
                      <td className="px-4 py-2.5 text-right"><NumInput value={p.price} onChange={(v) => setPkg(p.id, { price: v })} suffix="円" w="w-20" /></td>
                      <td className="px-4 py-2.5 text-right"><Trash onClick={() => delPkg(p.id)} disabled={pkgInUse(p.id)} title={pkgInUse(p.id) ? "製品で使用中のため削除できません" : "削除"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <AddButton onClick={addPkg}>包材を追加</AddButton>
          </>
        )}

        {/* ===== 生地 ===== */}
        {tab === "doughs" && (
          <>
            <p className="text-sm text-stone-500">配合（g）を登録すると、<b>仕込み1回の原価</b>と<b>1gあたりの原価</b>が出ます。小麦粉A＋Bのように<b>複数銘柄のブレンド</b>もそのまま行を並べるだけです。</p>
            {doughs.map((d) => {
              const w = doughWeight(d), c = doughCost(d);
              const remaining = materials.filter((m) => !d.ingredients.some((i) => i.materialId === m.id));
              return (
                <Card key={d.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3">
                    <div className="flex items-center gap-2"><Layers size={16} className="text-amber-500" /><TextInput value={d.name} onChange={(v) => setDough(d.id, { name: v })} className="w-44 font-semibold" /></div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                      <span className="text-stone-500">総量 <Num className="font-semibold text-stone-800">{w.toLocaleString()}g</Num></span>
                      <span className="text-stone-500">原価 <Num className="font-semibold text-stone-800">{yen(c)}</Num></span>
                      <span className="text-stone-500">1gあたり <Num className="font-semibold text-amber-700">{yen2(w > 0 ? c / w : 0)}</Num></span>
                      <Trash onClick={() => delDough(d.id)} disabled={doughInUse(d.id)} title={doughInUse(d.id) ? "パンで使用中のため削除できません" : "この生地を削除"} />
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">原材料</th><th className="px-4 py-2 text-right font-medium">配合</th><th className="px-4 py-2 text-right font-medium">金額</th><th className="px-4 py-2"></th></tr></thead>
                    <tbody>
                      {d.ingredients.map((i) => { const m = matById(i.materialId); return (
                        <tr key={i.materialId} className="border-t border-stone-100">
                          <td className="px-4 py-2">{m?.name || "（削除済み）"}</td>
                          <td className="px-4 py-2 text-right"><NumInput value={i.grams} onChange={(v) => setDoughGram(d.id, i.materialId, v)} suffix="g" w="w-20" /></td>
                          <td className="px-4 py-2 text-right text-stone-600"><Num>{yen((i.grams / 1000) * (m?.price || 0))}</Num></td>
                          <td className="px-4 py-2 text-right"><Trash onClick={() => delDoughIng(d.id, i.materialId)} title="この材料を外す" /></td>
                        </tr>); })}
                    </tbody>
                  </table>
                  {remaining.length > 0 && (
                    <div className="px-4 py-3">
                      <select value="" onChange={(e) => { if (e.target.value) addDoughIng(d.id, e.target.value); }} className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-500 focus:border-amber-400 focus:outline-none">
                        <option value="">＋ 原材料を追加（ブレンド可）</option>
                        {remaining.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                </Card>
              );
            })}
            <AddButton onClick={addDough}>生地を追加</AddButton>
          </>
        )}

        {/* ===== 自家製フィリング ===== */}
        {tab === "fillings" && (
          <>
            <p className="text-sm text-stone-500">手作りのあんこ・クリーム・クッキー生地などを登録します。仕入れ材料や<b>別の自家製パーツ</b>も材料に使えます（出来上がり量＝材料の合計）。</p>
            {fillings.map((f) => {
              const r = fillingCalc(f.id);
              return (
                <Card key={f.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3">
                    <div className="flex items-center gap-2"><ChefHat size={16} className="text-amber-500" /><TextInput value={f.name} onChange={(v) => setFill(f.id, { name: v })} className="w-56 font-semibold" /></div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                      <span className="text-stone-500">出来上がり <Num className="font-semibold text-stone-800">{r.grams.toLocaleString()}g</Num></span>
                      <span className="text-stone-500">原価 <Num className="font-semibold text-stone-800">{yen(r.cost)}</Num></span>
                      <span className="text-stone-500">1gあたり <Num className="font-semibold text-amber-700">{yen2(r.grams > 0 ? r.cost / r.grams : 0)}</Num></span>
                      <Trash onClick={() => delFill(f.id)} disabled={fillInUse(f.id)} title={fillInUse(f.id) ? "パンや他の自家製パーツで使用中のため削除できません" : "この自家製パーツを削除"} />
                    </div>
                  </div>
                  {r.cycle && (
                    <div className="flex items-center gap-1.5 bg-rose-50 px-4 py-2 text-xs text-rose-600"><AlertTriangle size={14} />参照が循環しています。配合を見直してください。</div>
                  )}
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">材料</th><th className="px-4 py-2 text-right font-medium">配合</th><th className="px-4 py-2 text-right font-medium">金額</th><th className="px-4 py-2"></th></tr></thead>
                    <tbody>
                      {f.components.map((c) => (
                        <tr key={c.kind + c.refId} className="border-t border-stone-100">
                          <td className="px-4 py-2">
                            {compName(c)}
                            {c.kind === "filling" && <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">自家製</span>}
                          </td>
                          <td className="px-4 py-2 text-right"><NumInput value={c.grams} onChange={(v) => setFillCompGram(f.id, c.kind, c.refId, v)} suffix="g" w="w-20" /></td>
                          <td className="px-4 py-2 text-right text-stone-600"><Num>{yen(compCost(c))}</Num></td>
                          <td className="px-4 py-2 text-right"><Trash onClick={() => delFillComp(f.id, c.kind, c.refId)} title="この材料を外す" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3">
                    {compSelect(f.components, f.id, (k, id) => addFillComp(f.id, k, id), "＋ 材料を追加（自家製も可）")}
                  </div>
                </Card>
              );
            })}
            <AddButton onClick={addFill}>自家製パーツを追加</AddButton>
          </>
        )}

        {/* ===== パン（レシピ） ===== */}
        {tab === "breads" && (
          <>
            <p className="text-sm text-stone-500">
              パン＝<b>レシピ</b>です（生地＋具材で、パン1個の原価が出ます）。価格や包材はここでは持たず、<b>製品タブ</b>で設定します。1つのパンを単品・セットなど複数の製品に使えます。
            </p>
            {breads.map((b) => {
              const c = breadCalc(b);
              return (
                <Card key={b.id} className="overflow-hidden">
                  <div className="grid gap-4 p-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Croissant size={16} className="shrink-0 text-amber-500" />
                        <TextInput value={b.name} onChange={(v) => setBread(b.id, { name: v })} className="w-full font-semibold" />
                        <Trash onClick={() => delBread(b.id)} disabled={breadInUse(b.id)} title={breadInUse(b.id) ? "製品で使用中のため削除できません" : "このパンを削除"} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-stone-500">生地</span>
                        <select value={b.doughId} onChange={(e) => setBread(b.id, { doughId: e.target.value })} className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm focus:border-amber-400 focus:outline-none">
                          {doughs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <NumInput value={b.doughG} onChange={(v) => setBread(b.id, { doughG: v })} suffix="g" w="w-20" />
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600">生地原価</span>
                          <Num className="text-stone-700">{yen(c.doughPart)}</Num>
                        </div>
                        {b.fillings.map((comp) => (
                          <div key={comp.kind + comp.refId} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-stone-600">
                              {compName(comp)}
                              {comp.kind === "filling" && <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-medium text-orange-700">自家製</span>}
                            </span>
                            <span className="flex items-center gap-2">
                              <NumInput value={comp.grams} onChange={(v) => setBreadCompGram(b.id, comp.kind, comp.refId, v)} suffix="g" w="w-16" />
                              <Num className="w-14 text-right text-stone-700">{yen(compCost(comp))}</Num>
                              <Trash onClick={() => delBreadComp(b.id, comp.kind, comp.refId)} title="外す" />
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">{compSelect(b.fillings, undefined, (k, id) => addBreadComp(b.id, k, id), "＋ 具材・フィリングを追加")}</div>
                    </div>
                    <div className="flex flex-col justify-center rounded-xl bg-stone-50 p-4">
                      <div className="text-xs text-stone-500">パン1個の原価（生地＋具材）</div>
                      <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-amber-700">{yen(c.total)}</div>
                      <div className="mt-2 text-xs text-stone-400">{c.doughName} {b.doughG}g ＋ 具材{b.fillings.length}種</div>
                    </div>
                  </div>
                </Card>
              );
            })}
            <AddButton onClick={addBread}>パンを追加</AddButton>
          </>
        )}

        {/* ===== 製品（売り物） ===== */}
        {tab === "products" && (
          <>
            <Card className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <Percent size={16} className="text-amber-500" /><span className="font-medium">目標原価率</span>
              <NumInput value={Math.round(targetRate * 1000) / 10} onChange={(v) => setTargetRate((v || 0) / 100)} suffix="%" w="w-16" />
              <span className="text-stone-400">→ この原価率になる売価を提案します</span>
            </Card>
            <p className="text-sm text-stone-500">製品＝<b>売り物</b>です。パン（レシピ）を選んで個数・包材・販売価格を設定します。<b>想定価格シミュレーター</b>で「この値段なら原価率いくつ？」をその場で確認できます。</p>
            {products.map((p) => {
              const c = productCalc(p);
              const remainingBreads = breads.filter((b) => !(p.items || []).some((it) => it.breadId === b.id));
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="grid gap-4 p-4 md:grid-cols-2">
                    {/* 左：構成 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <TextInput value={p.name} onChange={(v) => setProd(p.id, { name: v })} className="w-full font-semibold" />
                        <Trash onClick={() => delProd(p.id)} title="この製品を削除" />
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm">
                        {(p.items || []).map((it) => {
                          const b = breadById(it.breadId);
                          const bc = b ? breadCalc(b).total : 0;
                          return (
                            <div key={it.breadId} className="flex items-center justify-between">
                              <span className="text-stone-600">{b?.name || "（削除済み）"}</span>
                              <span className="flex items-center gap-2">
                                <NumInput value={it.count} onChange={(v) => setProdItemCount(p.id, it.breadId, v)} suffix="個" w="w-14" />
                                <Num className="w-16 text-right text-stone-700">{yen(bc * (it.count || 0))}</Num>
                                <Trash onClick={() => delProdItem(p.id, it.breadId)} title="外す" />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {remainingBreads.length > 0 && (
                        <div className="mt-2">
                          <select value="" onChange={(e) => { if (e.target.value) addProdItem(p.id, e.target.value); }}
                            className="rounded-lg border border-dashed border-stone-300 px-2 py-1.5 text-sm text-stone-500 focus:border-amber-400 focus:outline-none">
                            <option value="">＋ パンを追加（セット化）</option>
                            {remainingBreads.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-stone-400">包材（タップで選択）</div>
                        <div className="flex flex-wrap gap-1.5">
                          {packaging.map((pk) => { const on = (p.packaging || []).includes(pk.id); return (
                            <button key={pk.id} onClick={() => toggleProdPkg(p.id, pk.id)} className={"rounded-full border px-2.5 py-1 text-xs font-medium " + (on ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-stone-300")}>{pk.name}</button>
                          ); })}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                        <span className="text-stone-500">製品原価（パン {yen(c.breadPart)} ＋ 包材 {yen(c.pkgPart)}）</span>
                        <Num className="font-semibold text-amber-700">{yen(c.total)}</Num>
                      </div>
                    </div>

                    {/* 右：価格・原価率・シミュレーター */}
                    <div className="flex flex-col justify-between gap-3 rounded-xl bg-stone-50 p-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xs text-stone-500">販売価格（実際）</div>
                          <NumInput value={p.price} onChange={(v) => setProd(p.id, { price: v })} suffix="円" w="w-24" />
                          <div className="mt-1 text-xs text-stone-400">推奨売価 @{pct(targetRate)}：<Num>{yen(c.suggested)}</Num></div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-stone-500">実際の原価率</div>
                          <div className="mt-1"><RateBadge rate={c.rate} target={targetRate} /></div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"><Calculator size={13} /> 想定価格シミュレーター</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-amber-900">
                            もし
                            <NumInput value={p.simPrice} onChange={(v) => setProd(p.id, { simPrice: v })} suffix="円" w="w-24" />
                            で売ると…
                          </span>
                          <RateBadge rate={c.simRate} target={targetRate} />
                        </div>
                        <div className="mt-1.5 text-xs text-amber-700">
                          {isFinite(c.simRate) && (
                            c.simRate <= targetRate
                              ? <>目標{pct(targetRate)}以内です（余裕 {pct(targetRate - c.simRate)}）</>
                              : <>目標{pct(targetRate)}を {pct(c.simRate - targetRate)} 超えています</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            <AddButton onClick={addProd}>製品を追加</AddButton>
          </>
        )}

        {/* ===== 出荷・所要量 ===== */}
        {tab === "shipment" && (
          <>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <Info size={16} className="mt-0.5 shrink-0" /><p>製品ごとの出荷数を入れると、<b>必要なパンの個数 → 生地・自家製フィリング → 原材料・包材</b>まで自動で展開されます。</p>
            </div>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead><tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-4 py-3 font-medium">製品</th><th className="px-4 py-3 text-right font-medium">出荷数</th><th className="px-4 py-3 text-right font-medium">製品原価</th><th className="px-4 py-3 text-right font-medium">原価合計</th><th className="px-4 py-3 text-right font-medium">売価</th><th className="px-4 py-3 text-right font-medium">売上</th>
                </tr></thead>
                <tbody>
                  {products.map((p) => { const c = productCalc(p); const qty = shipment[p.id] || 0; return (
                    <tr key={p.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="px-4 py-2.5 text-right"><NumInput value={qty} onChange={(v) => setQty(p.id, v)} suffix="個" w="w-20" /></td>
                      <td className="px-4 py-2.5 text-right text-stone-500"><Num>{yen(c.total)}</Num></td>
                      <td className="px-4 py-2.5 text-right"><Num>{yen(c.total * qty)}</Num></td>
                      <td className="px-4 py-2.5 text-right text-stone-500"><Num>{yen(p.price)}</Num></td>
                      <td className="px-4 py-2.5 text-right"><Num>{yen(p.price * qty)}</Num></td>
                    </tr>); })}
                </tbody>
              </table>
            </Card>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatBox label="総原価" value={yen(dayCost)} tone="amber" />
              <StatBox label="総売上" value={yen(dayRevenue)} />
              <StatBox label="粗利" value={yen(dayProfit)} tone="emerald" />
              <StatBox label="原価率" value={pct(dayRate)} tone={dayRate > targetRate + 0.005 ? "rose" : "emerald"} sub={"目標 " + pct(targetRate)} />
            </div>

            {!hasNeeds ? (
              <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-400">出荷数を入力すると、必要なパン・生地・自家製フィリング・原材料・包材が表示されます。</p>
            ) : (
              <>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 font-semibold"><Croissant size={16} className="text-amber-500" /> 焼くパンの数</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">パン</th><th className="px-4 py-2 text-right font-medium">必要個数</th></tr></thead>
                    <tbody>
                      {breads.map((b) => { const n = breadNeeds[b.id] || 0; if (n <= 0) return null; return (
                        <tr key={b.id} className="border-t border-stone-100">
                          <td className="px-4 py-2.5 font-medium">{b.name}</td>
                          <td className="px-4 py-2.5 text-right"><Num className="font-semibold">{n.toLocaleString()} 個</Num></td>
                        </tr>); })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 text-xs text-stone-400">※ セット製品のパンも個数に展開して合算しています。</div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 font-semibold"><Layers size={16} className="text-amber-500" /> 必要な生地の量</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">生地</th><th className="px-4 py-2 text-right font-medium">必要量</th><th className="px-4 py-2 text-right font-medium">仕込み回数</th><th className="px-4 py-2 text-right font-medium">生地原価</th></tr></thead>
                    <tbody>
                      {doughs.map((d) => { const g = doughNeeds[d.id] || 0; if (g <= 0) return null; const w = doughWeight(d); return (
                        <tr key={d.id} className="border-t border-stone-100">
                          <td className="px-4 py-2.5 font-medium">{d.name}</td>
                          <td className="px-4 py-2.5 text-right"><Num className="font-semibold">{kg(g)}kg</Num> <span className="text-xs text-stone-400">({Math.round(g).toLocaleString()}g)</span></td>
                          <td className="px-4 py-2.5 text-right"><Num>{(w > 0 ? g / w : 0).toFixed(1)} 回</Num></td>
                          <td className="px-4 py-2.5 text-right text-stone-600"><Num>{yen(doughCostPerG(d) * g)}</Num></td>
                        </tr>); })}
                    </tbody>
                  </table>
                </Card>

                {Object.keys(fillingNeeds).length > 0 && (
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 font-semibold"><ChefHat size={16} className="text-amber-500" /> 必要な自家製フィリング</div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">自家製パーツ</th><th className="px-4 py-2 text-right font-medium">必要量</th><th className="px-4 py-2 text-right font-medium">原価</th></tr></thead>
                      <tbody>
                        {fillings.map((f) => { const g = fillingNeeds[f.id] || 0; if (g <= 0) return null; return (
                          <tr key={f.id} className="border-t border-stone-100">
                            <td className="px-4 py-2.5 font-medium">{f.name}</td>
                            <td className="px-4 py-2.5 text-right"><Num className="font-semibold">{kg(g)}kg</Num> <span className="text-xs text-stone-400">({Math.round(g).toLocaleString()}g)</span></td>
                            <td className="px-4 py-2.5 text-right text-stone-600"><Num>{yen(fillingPerG(f.id) * g)}</Num></td>
                          </tr>); })}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 text-xs text-stone-400">※ 別の自家製パーツの材料として使われる分も合算しています。</div>
                  </Card>
                )}

                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3">
                    <span className="flex items-center gap-2 font-semibold"><Wheat size={16} className="text-amber-500" /> 必要な原材料</span>
                    <span className="text-sm text-stone-500">材料費合計 <Num className="font-semibold text-stone-800">{yen(totalMatCost)}</Num></span>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">原材料</th><th className="px-4 py-2 text-right font-medium">必要量</th><th className="px-4 py-2 text-right font-medium">金額</th></tr></thead>
                    <tbody>
                      {materials.filter((m) => matNeeds[m.id] > 0).map((m) => { const g = matNeeds[m.id]; return (
                        <tr key={m.id} className="border-t border-stone-100">
                          <td className="px-4 py-2.5 font-medium">{m.name}</td>
                          <td className="px-4 py-2.5 text-right"><Num className="font-semibold">{kg(g)}kg</Num> <span className="text-xs text-stone-400">({Math.round(g).toLocaleString()}g)</span></td>
                          <td className="px-4 py-2.5 text-right text-stone-600"><Num>{yen((g / 1000) * m.price)}</Num></td>
                        </tr>); })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 text-xs text-stone-400">※ 生地・自家製フィリングをすべて材料まで分解した合計です（銘柄別）。</div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 font-semibold"><Package size={16} className="text-amber-500" /> 必要な包材</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stone-400"><th className="px-4 py-2 font-medium">包材</th><th className="px-4 py-2 text-right font-medium">必要枚数</th><th className="px-4 py-2 text-right font-medium">金額</th></tr></thead>
                    <tbody>
                      {packaging.filter((p) => pkgNeeds[p.id] > 0).map((p) => { const n = pkgNeeds[p.id]; return (
                        <tr key={p.id} className="border-t border-stone-100">
                          <td className="px-4 py-2.5 font-medium">{p.name}</td>
                          <td className="px-4 py-2.5 text-right"><Num className="font-semibold">{n.toLocaleString()} 枚</Num></td>
                          <td className="px-4 py-2.5 text-right text-stone-600"><Num>{yen(n * p.price)}</Num></td>
                        </tr>); })}
                    </tbody>
                  </table>
                </Card>
                <p className="flex items-center gap-1.5 text-xs text-stone-400"><ArrowRight size={14} /> 製品 → パン → 生地・自家製 → 原材料、と一本でつながっています。</p>
              </>
            )}
          </>
        )}

        <div className="pt-2 text-center">
          <button onClick={resetAll} className="text-xs text-stone-400 underline hover:text-stone-600">データをサンプルに戻す</button>
        </div>
      </main>
    </div>
  );
}
