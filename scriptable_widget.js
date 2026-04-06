// ============================================================
//  帳本桌面小工具 — iOS Scriptable
//  使用方式：
//  1. 在 App Store 安裝「Scriptable」
//  2. 開啟 Scriptable → 新增腳本 → 貼上此程式碼
//  3. 將「API_URL」換成你的 Google Apps Script 網址
//  4. 回到主畫面，長按 → 新增小工具 → 選 Scriptable
//  5. 編輯小工具 → 選此腳本，尺寸建議 Medium
// ============================================================

const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"; // ← 填入你的 API
const APP_URL = "scriptable:///run?scriptName=帳本"; // 點擊時開啟的動作

// ── 顏色主題 ──
const C = {
  bg:      new Color("#111111"),
  card:    new Color("#1e1e1e"),
  white:   new Color("#ffffff"),
  green:   new Color("#1aad5e"),
  red:     new Color("#e03535"),
  gold:    new Color("#f59e0b"),
  muted:   new Color("#888880"),
  muted2:  new Color("#555550"),
};

// ── 取得當月 yyyy-MM ──
function getMonth(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ── 格式化金額 ──
function fmt(n){ return `$${Math.abs(n).toFixed(2)}`; }

// ── 從 API 取資料 ──
async function fetchData(){
  const url = `${API_URL}?action=getTransactions`;
  const req = new Request(url);
  req.timeoutInterval = 15;
  try{
    const all = await req.loadJSON();
    const mo = getMonth();
    return (Array.isArray(all) ? all : []).filter(t => t.date && String(t.date).slice(0,7) === mo);
  }catch{ return null; }
}

// ── 計算收支 ──
function calcStats(txs){
  let inc = 0, exp = 0;
  txs.forEach(t => {
    const u = parseFloat(t.amount_usd) || 0;
    if(t.type === "income") inc += u; else exp += u;
  });
  return { inc, exp, net: inc - exp };
}

// ── 建立小工具（Medium 尺寸）──
async function buildWidget(txs, error){
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(16, 18, 16, 18);
  w.url = APP_URL;

  // 頂部列
  const topRow = w.addStack();
  topRow.layoutHorizontally();
  topRow.centerAlignContent();

  const iconTxt = topRow.addText("📒");
  iconTxt.font = Font.systemFont(22);

  topRow.addSpacer();

  const d = new Date();
  const moLbl = topRow.addText(d.toLocaleDateString("zh-TW", {year:"numeric", month:"long"}));
  moLbl.font = Font.mediumSystemFont(11);
  moLbl.textColor = C.muted;

  topRow.addSpacer();

  // 狀態點
  const dotColor = error ? C.red : (txs ? C.green : C.gold);
  const dotSym = SFSymbol.named("circle.fill");
  const dotImg = topRow.addImage(dotSym.image);
  dotImg.imageSize = new Size(8,8);
  dotImg.tintColor = dotColor;

  w.addSpacer(12);

  if(error || !txs){
    // 錯誤狀態
    const errTxt = w.addText(error === "no_api" ? "請在 App 設定 API URL" : "無法連線，請稍後再試");
    errTxt.font = Font.systemFont(13);
    errTxt.textColor = C.muted;
    errTxt.centerAlignText();
    return w;
  }

  const { inc, exp, net } = calcStats(txs);
  const pct = inc > 0 ? Math.min(100, Math.round(exp/inc*100)) : (exp>0?100:0);

  // 主餘額
  const balLbl = w.addText("本月淨餘 (USD)");
  balLbl.font = Font.mediumSystemFont(10);
  balLbl.textColor = C.muted;

  w.addSpacer(4);

  const sign = net >= 0 ? "+" : "−";
  const balVal = w.addText(`${sign}${fmt(net)}`);
  balVal.font = Font.boldSystemFont(32);
  balVal.textColor = net >= 0 ? C.white : C.red;
  balVal.minimumScaleFactor = 0.6;

  w.addSpacer(12);

  // 收支卡片列
  const statsRow = w.addStack();
  statsRow.layoutHorizontally();
  statsRow.spacing = 8;

  // 收入卡
  const incBox = statsRow.addStack();
  incBox.layoutVertically();
  incBox.setPadding(10, 12, 10, 12);
  incBox.backgroundColor = C.card;
  incBox.cornerRadius = 12;

  const incLbl = incBox.addText("收入");
  incLbl.font = Font.mediumSystemFont(9);
  incLbl.textColor = C.muted;
  incBox.addSpacer(4);
  const incVal = incBox.addText(`+${fmt(inc)}`);
  incVal.font = Font.boldSystemFont(14);
  incVal.textColor = C.green;

  // 支出卡
  const expBox = statsRow.addStack();
  expBox.layoutVertically();
  expBox.setPadding(10, 12, 10, 12);
  expBox.backgroundColor = C.card;
  expBox.cornerRadius = 12;

  const expLbl = expBox.addText("支出");
  expLbl.font = Font.mediumSystemFont(9);
  expLbl.textColor = C.muted;
  expBox.addSpacer(4);
  const expVal = expBox.addText(`−${fmt(exp)}`);
  expVal.font = Font.boldSystemFont(14);
  expVal.textColor = C.red;

  statsRow.addSpacer();

  // 筆數
  const cntBox = statsRow.addStack();
  cntBox.layoutVertically();
  cntBox.setPadding(10, 12, 10, 12);
  cntBox.backgroundColor = C.card;
  cntBox.cornerRadius = 12;

  const cntLbl = cntBox.addText("筆數");
  cntLbl.font = Font.mediumSystemFont(9);
  cntLbl.textColor = C.muted;
  cntBox.addSpacer(4);
  const cntVal = cntBox.addText(`${txs.length}`);
  cntVal.font = Font.boldSystemFont(14);
  cntVal.textColor = C.white;

  w.addSpacer(10);

  // 支出比例進度條
  const budgetRow = w.addStack();
  budgetRow.layoutHorizontally();
  budgetRow.centerAlignContent();

  const budgLbl = budgetRow.addText("支出 / 收入");
  budgLbl.font = Font.mediumSystemFont(9);
  budgLbl.textColor = C.muted;
  budgetRow.addSpacer();
  const budgPct = budgetRow.addText(`${pct}%`);
  budgPct.font = Font.boldSystemFont(11);
  budgPct.textColor = pct < 60 ? C.green : pct < 90 ? C.gold : C.red;

  w.addSpacer(5);

  // 進度條（用 drawContext 畫）
  const barCtx = new DrawContext();
  barCtx.size = new Size(280, 6);
  barCtx.opaque = false;
  barCtx.respectScreenScale = true;
  barCtx.setFillColor(new Color("#333333"));
  barCtx.fillRect(new Rect(0, 0, 280, 6));
  const fillColor = pct < 60 ? C.green : pct < 90 ? C.gold : C.red;
  barCtx.setFillColor(fillColor);
  barCtx.fillRect(new Rect(0, 0, Math.round(280 * pct / 100), 6));
  const barImg = w.addImage(barCtx.getImage());
  barImg.resizable = false;
  barImg.centerAlignImage();

  w.addSpacer(10);

  // 最近一筆交易
  const recent = txs.slice(0, 2);
  if(recent.length > 0){
    const recLbl = w.addText("最近交易");
    recLbl.font = Font.mediumSystemFont(9);
    recLbl.textColor = C.muted;
    w.addSpacer(5);

    recent.forEach(tx => {
      const row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 8;

      const cat = tx.category || "未分類";
      const catTxt = row.addText(cat.slice(0,6) + (cat.length>6?"…":""));
      catTxt.font = Font.mediumSystemFont(12);
      catTxt.textColor = C.white;

      row.addSpacer();

      const u = parseFloat(tx.amount_usd) || 0;
      const isInc = tx.type === "income";
      const amtTxt = row.addText(`${isInc?"+":"−"}$${u.toFixed(2)}`);
      amtTxt.font = Font.boldSystemFont(12);
      amtTxt.textColor = isInc ? C.green : C.red;

      w.addSpacer(4);
    });
  }

  return w;
}

// ── 主程式 ──
async function main(){
  const api = API_URL;
  if(!api || api.includes("YOUR_SCRIPT_ID")){
    const w = await buildWidget(null, "no_api");
    if(config.runsInWidget) Script.setWidget(w);
    else await w.presentMedium();
    Script.complete();
    return;
  }

  const txs = await fetchData();
  const w = await buildWidget(txs, txs === null ? "error" : null);

  if(config.runsInWidget){
    Script.setWidget(w);
  } else {
    await w.presentMedium();
  }
  Script.complete();
}

await main();
