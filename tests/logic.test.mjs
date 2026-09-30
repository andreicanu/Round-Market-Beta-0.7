import * as L from "../src/logic.js";
let pass = true; const fail = (m) => { console.log("FAIL:", m); pass = false; };

// T codes: all rounds, suppliers, negotiation, edge values
for (let r = 1; r <= L.MAX_ROUNDS; r++) for (const s of ["E","S","P"]) for (const n of ["accept","decline"]) {
  for (const [q,p,m] of [[0,1,0],[120,18,300],[9999,9999,99999]]) {
    const d = { supplier:s, orderQty:q, price:p, marketing:m, negotiation:n };
    const c = L.encodeTrade(r, d); const b = L.decodeTrade(c);
    if (b.error || b.round !== r || JSON.stringify(b.decision) !== JSON.stringify(d)) fail(`T ${r}${s}${n}${q}: ${JSON.stringify(b)}`);
  }
}
console.log("T sample:", L.chunkCode(L.encodeTrade(1,{supplier:"S",orderQty:100,price:20,marketing:200,negotiation:"decline"})),
  "| max len:", L.encodeTrade(12,{supplier:"P",orderQty:9999,price:9999,marketing:99999,negotiation:"accept"}).length);

// B codes
for (let r = 1; r <= L.MAX_ROUNDS; r++) for (const e of L.EVENT_LIST) {
  const b = L.decodeBriefing(L.encodeBriefing(r, e.key));
  if (b.error || b.round !== r || b.eventKey !== e.key) fail(`B ${r} ${e.key}`);
}
console.log("B sample:", L.encodeBriefing(1,"none"), L.encodeBriefing(7,"recession"), L.encodeBriefing(12,"inflation"));

// R codes incl. negatives & clamps
const cases = [
  {round:1,unitsSold:96,lostSales:52,leftover:0,marketShare:37,profit:660,cash:10660},
  {round:7,unitsSold:0,lostSales:0,leftover:240,marketShare:0,profit:-1850,cash:-320},
  {round:12,unitsSold:14700,lostSales:9000,leftover:119988,marketShare:100,profit:-999999,cash:5000000},
  {round:4,unitsSold:12,lostSales:3,leftover:7,marketShare:8.3,profit:-5,cash:0},
];
for (const c of cases) {
  const code = L.encodeReport(c, c.cash); const b = L.decodeReport(code);
  if (b.error) { fail("R " + b.error); continue; }
  const r = b.report;
  const ok = r.round===c.round && r.unitsSold===c.unitsSold && r.lostSales===c.lostSales && r.leftover===c.leftover
    && Math.abs(r.marketShare-c.marketShare)<0.051 && r.profit===c.profit && r.cash===c.cash;
  if (!ok) fail(`R mismatch ${JSON.stringify(c)} -> ${JSON.stringify(r)}`);
  console.log("R", code.length, L.chunkCode(code), ok ? "OK" : "X");
}

// cross-kind & typo messages
const t = L.encodeTrade(2,{supplier:"S",orderQty:100,price:20,marketing:200,negotiation:"decline"});
console.log("T into B:", L.decodeBriefing(t).error);
console.log("B into R:", L.decodeReport(L.encodeBriefing(2,"boom")).error);
console.log("garbage:", L.decodeReport("xyz").error);
const rc = L.encodeReport(cases[0], 10660);
const typo = rc.slice(0,5) + (rc[5]==="0"?"1":"0") + rc.slice(6);
console.log("typo:", L.decodeReport(typo).error);
console.log("spaces+lower:", L.decodeReport(" " + L.chunkCode(rc).toLowerCase() + " ").report ? "OK" : "FAIL");
// typo detection rate for T codes (single-char substitution)
let caught = 0, total = 0;
const alph = "0123456789abcdefghijklmnopqrstuvwxyz";
const tc = L.normalizeCode(t);
for (let i = 1; i < tc.length; i++) for (const ch of alph) { if (ch === tc[i]) continue; total++;
  const r = L.decodeTrade(tc.slice(0,i)+ch+tc.slice(i+1)); if (r.error) caught++; }
console.log(`single-char typo detection: ${caught}/${total} (${(100*caught/total).toFixed(1)}%)`);

// validation
console.log(L.validateDraft({supplier:"S",qty:"",price:"20",mkt:"0",neg:"decline"}).error);
console.log(L.validateDraft({supplier:"S",qty:"10",price:"0",mkt:"0",neg:"decline"}).error);
console.log(L.validateSetup(["A","a"],{rounds:"8",cash:"10000",demand:"400",growth:"20"}));
console.log(L.validateSetup(["A","B"],{rounds:"13",cash:"10000",demand:"400",growth:"20"}));
console.log(L.validateSetup(["A","B"],{rounds:"8",cash:"10000",demand:"400",growth:"20"}) === null ? "setup valid OK" : "FAIL");

// engine: shares sum to ~100, no NaN, negotiations apply
const teams = ["A","B","C"];
const dec = { A:{supplier:"E",orderQty:160,price:18,marketing:300,negotiation:"accept"}, B:{supplier:"S",orderQty:130,price:21,marketing:250,negotiation:"decline"}, C:{supplier:"P",orderQty:150,price:25,marketing:500,negotiation:"accept"} };
const S = { rounds:"8", cash:"10000", demand:"400", growth:"20" };
for (const ev of L.EVENT_LIST) for (const round of [1,3,6]) {
  const res = L.resolveRound(round, teams, dec, {A:0,B:10,C:0}, S, ev.key);
  const sum = teams.reduce((s,x)=>s+res[x].marketShare,0);
  if (Math.abs(sum-100) > 0.3) fail(`share sum ${sum} ${ev.key} r${round}`);
  if (teams.some(x => [res[x].profit,res[x].unitsSold].some(Number.isNaN))) fail(`NaN ${ev.key}`);
}
const r3a = L.resolveRound(3, ["A"], {A:{...dec.A,negotiation:"decline"}}, {A:0}, S, "none");
const r3b = L.resolveRound(3, ["A"], {A:dec.A}, {A:0}, S, "none");
console.log("bulk discount raises profit:", r3b.A.profit > r3a.A.profit ? "OK" : "FAIL");
console.log(pass ? "\nLOGIC PASS" : "\nLOGIC FAILED");
