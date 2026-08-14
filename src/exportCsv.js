/**
 * exportCsv.js — 全データをCSVで書き出す
 * --------------------------------------------------------------
 * Googleスプレッドシートにそのまま取り込める形式（UTF-8 BOM付き）で出力します。
 * 6種類（原材料／包材／生地／自家製フィリング／パン／製品）を個別に、
 * またはまとめて一括ダウンロードできます。
 */

/* CSVの1セル分を安全な文字列にする（カンマ・改行・引用符に対応） */
const cell = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCsv = (rows) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** ファイルとしてダウンロード（BOM付きUTF-8＝日本語が文字化けしない） */
function download(filename, csv) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); window.URL.revokeObjectURL(url);
}

const stamp = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

/**
 * 全データからCSVシートを組み立てる。
 * @param {object} d {materials,packaging,doughs,fillings,breads,products,shipment,targetRate}
 * @param {object} calc 計算関数群 {doughWeight,doughCost,doughCostPerG,fillingCalc,fillingPerG,breadCalc,productCalc}
 * @returns {Array<{name:string, filename:string, csv:string}>}
 */
export function buildSheets(d, calc) {
  const { materials, packaging, doughs, fillings, breads, products } = d;
  const matName = (id) => materials.find((m) => m.id === id)?.name || "（削除済み）";
  const fillName = (id) => fillings.find((f) => f.id === id)?.name || "（削除済み）";
  const r2 = (n) => Math.round((n || 0) * 100) / 100;

  /* 1. 原材料 */
  const s1 = [["原材料名", "単位", "単価(円)", "1gあたり(円)"]];
  materials.forEach((m) => s1.push([m.name, m.unit, m.price, r2(m.price / 1000)]));

  /* 2. 包材 */
  const s2 = [["包材名", "単価(円/枚)"]];
  packaging.forEach((p) => s2.push([p.name, p.price]));

  /* 3. 生地（配合を1行ずつ） */
  const s3 = [["生地名", "原材料", "配合(g)", "金額(円)", "生地の総量(g)", "仕込み原価(円)", "1gあたり原価(円)"]];
  doughs.forEach((dg) => {
    const w = calc.doughWeight(dg), c = calc.doughCost(dg), pg = calc.doughCostPerG(dg);
    if (dg.ingredients.length === 0) s3.push([dg.name, "（配合なし）", "", "", w, r2(c), r2(pg)]);
    dg.ingredients.forEach((i, idx) => {
      const price = materials.find((m) => m.id === i.materialId)?.price || 0;
      s3.push([dg.name, matName(i.materialId), i.grams, r2((i.grams / 1000) * price),
        idx === 0 ? w : "", idx === 0 ? r2(c) : "", idx === 0 ? r2(pg) : ""]);
    });
  });

  /* 4. 自家製フィリング */
  const s4 = [["自家製パーツ名", "材料", "種別", "配合(g)", "金額(円)", "出来上がり(g)", "原価(円)", "1gあたり原価(円)"]];
  fillings.forEach((f) => {
    const r = calc.fillingCalc(f.id);
    const pg = r.grams > 0 ? r.cost / r.grams : 0;
    if (f.components.length === 0) s4.push([f.name, "（材料なし）", "", "", "", r.grams, r2(r.cost), r2(pg)]);
    f.components.forEach((c, idx) => {
      const isMat = c.kind === "material";
      const amount = isMat
        ? (c.grams / 1000) * (materials.find((m) => m.id === c.refId)?.price || 0)
        : calc.fillingPerG(c.refId) * c.grams;
      s4.push([f.name, isMat ? matName(c.refId) : fillName(c.refId), isMat ? "仕入れ材料" : "自家製",
        c.grams, r2(amount),
        idx === 0 ? r.grams : "", idx === 0 ? r2(r.cost) : "", idx === 0 ? r2(pg) : ""]);
    });
  });

  /* 5. パン（レシピ） */
  const s5 = [["パン名", "生地", "生地量(g)", "生地原価(円)", "具材", "具材種別", "具材量(g)", "具材原価(円)", "パン1個の原価(円)"]];
  breads.forEach((b) => {
    const bc = calc.breadCalc(b);
    if (b.fillings.length === 0) {
      s5.push([b.name, bc.doughName, b.doughG, r2(bc.doughPart), "（具材なし）", "", "", "", r2(bc.total)]);
    }
    b.fillings.forEach((c, idx) => {
      const isMat = c.kind === "material";
      const amount = isMat
        ? (c.grams / 1000) * (materials.find((m) => m.id === c.refId)?.price || 0)
        : calc.fillingPerG(c.refId) * c.grams;
      s5.push([b.name, idx === 0 ? bc.doughName : "", idx === 0 ? b.doughG : "", idx === 0 ? r2(bc.doughPart) : "",
        isMat ? matName(c.refId) : fillName(c.refId), isMat ? "仕入れ材料" : "自家製",
        c.grams, r2(amount), idx === 0 ? r2(bc.total) : ""]);
    });
  });

  /* 6. 製品（売り物・原価率） */
  const s6 = [["製品名", "内容(パン×個数)", "包材", "パン原価(円)", "包材費(円)", "製品原価(円)", "販売価格(円)", "原価率(%)", "推奨売価(円)", "想定価格(円)", "想定時の原価率(%)"]];
  products.forEach((p) => {
    const c = calc.productCalc(p);
    const items = (p.items || []).map((it) => {
      const b = breads.find((x) => x.id === it.breadId);
      return `${b?.name || "（削除済み）"}×${it.count}`;
    }).join(" / ");
    const pkgs = (p.packaging || []).map((id) => packaging.find((x) => x.id === id)?.name || "").filter(Boolean).join(" / ");
    s6.push([p.name, items, pkgs, r2(c.breadPart), r2(c.pkgPart), r2(c.total), p.price,
      isFinite(c.rate) ? r2(c.rate * 100) : "", c.suggested,
      p.simPrice || "", isFinite(c.simRate) ? r2(c.simRate * 100) : ""]);
  });

  const t = stamp();
  return [
    { name: "原材料", filename: `原価計算_原材料_${t}.csv`, csv: toCsv(s1) },
    { name: "包材", filename: `原価計算_包材_${t}.csv`, csv: toCsv(s2) },
    { name: "生地", filename: `原価計算_生地_${t}.csv`, csv: toCsv(s3) },
    { name: "自家製フィリング", filename: `原価計算_自家製フィリング_${t}.csv`, csv: toCsv(s4) },
    { name: "パン", filename: `原価計算_パン_${t}.csv`, csv: toCsv(s5) },
    { name: "製品", filename: `原価計算_製品_${t}.csv`, csv: toCsv(s6) },
  ];
}

/** シート1つをダウンロード */
export function downloadSheet(sheet) {
  download(sheet.filename, sheet.csv);
}

/** 全シートをまとめてダウンロード（順番にファイルが落ちてきます） */
export async function downloadAllSheets(sheets) {
  for (const s of sheets) {
    download(s.filename, s.csv);
    await new Promise((r) => setTimeout(r, 350)); // ブラウザが連続DLを止めないよう間隔をあける
  }
}
