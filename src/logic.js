/* ============================================================
   The Round Market — game logic (no UI)
   ============================================================ */

export const MAX_ROUNDS = 12;
export const HOLDING_COST = 1;
export const LIMITS = { qty: 9999, price: 9999, mkt: 99999, cash: 1000000, demand: 5000, growth: 500, teams: 12 };

export const SUPPLIERS = {
  E: { key: "E", idx: 0, label: "Economy", unitCost: 8, reliability: 0.8, note: "$8 a unit. Only 80% of your order arrives." },
  S: { key: "S", idx: 1, label: "Standard", unitCost: 12, reliability: 0.95, note: "$12 a unit. 95% of your order arrives." },
  P: { key: "P", idx: 2, label: "Premium", unitCost: 16, reliability: 1, note: "$16 a unit. Your whole order arrives." },
};
const SUP_BY_IDX = ["E", "S", "P"];

export const NEGOTIATIONS = {
  3: {
    type: "bulk", threshold: 150, discount: 0.25,
    title: "Bulk discount offer",
    text: "Order at least 150 units this round and your supplier cuts the unit price by 25% on the whole order.",
    accept: "Take the discount (I'll order 150 or more)",
    decline: "No thanks",
  },
  6: {
    type: "client", units: 80, discount: 0.2,
    title: "A large retailer wants a deal",
    text: "They will buy 80 of your units whatever your market share, but at 20% below your price. Everything else sells as normal.",
    accept: "Accept the deal",
    decline: "Turn it down",
  },
};

export const MARKET_EVENTS = {
  none: {
    key: "none", idx: 0, kind: "neutral", label: "Normal round", effect: "No special conditions.",
    demandMult: 1, deliveryMult: 1, costMult: 1, priceSensitivity: 1, mktEff: 1,
    headline: "Markets hold steady as the quarter opens",
    story: "Analysts call conditions unremarkable, which in this industry counts as good news. Demand is on its usual path, suppliers are shipping on time and no shock is in sight. Whatever happens this quarter will come down to the choices firms make.",
  },
  boom: {
    key: "boom", idx: 1, kind: "bonus", label: "Seasonal boom", effect: "Total demand is 40% higher.",
    demandMult: 1.4, deliveryMult: 1, costMult: 1, priceSensitivity: 1, mktEff: 1,
    headline: "Buying frenzy: demand jumps 40%",
    story: "The seasonal wave arrived early and bigger than forecast. Shops are busy and waiting lists are forming. Every firm with stock on hand stands to profit, and the trade press is blunt about it: this quarter, running out costs far more than holding too much.",
  },
  viral: {
    key: "viral", idx: 2, kind: "bonus", label: "Viral moment", effect: "Marketing works 50% better for everyone.",
    demandMult: 1, deliveryMult: 1, costMult: 1, priceSensitivity: 1, mktEff: 1.5,
    headline: "The whole category goes viral",
    story: "An unplanned social media moment has put the product in the spotlight. Campaigns that would normally be ignored are being shared instead. Firms willing to open the marketing budget this quarter will find every dollar working harder than usual.",
  },
  cheap: {
    key: "cheap", idx: 3, kind: "bonus", label: "Cheap inputs", effect: "Unit costs are 20% lower at every supplier.",
    demandMult: 1, deliveryMult: 1, costMult: 0.8, priceSensitivity: 1, mktEff: 1,
    headline: "Input costs tumble across the supply base",
    story: "A glut upstream has suppliers competing for orders, and unit costs are down about a fifth. The strategic question is what to do with the windfall: keep it as margin, or pass it on as a lower price and take share while rivals hesitate.",
  },
  recession: {
    key: "recession", idx: 4, kind: "risk", label: "Recession", effect: "Total demand is 30% lower.",
    demandMult: 0.7, deliveryMult: 1, costMult: 1, priceSensitivity: 1, mktEff: 1,
    headline: "Downturn bites as shoppers pull back",
    story: "Households are holding on to their money and the market has shrunk sharply. There is simply less to go around. Firms that over-order will sit on stock they cannot move, and buying less may prove smarter than trying to sell more.",
  },
  squeeze: {
    key: "squeeze", idx: 5, kind: "risk", label: "Supply squeeze", effect: "Every supplier delivers 15% less.",
    demandMult: 1, deliveryMult: 0.85, costMult: 1, priceSensitivity: 1, mktEff: 1,
    headline: "Logistics snarl leaves orders short",
    story: "Port congestion and scarce freight mean shipments are arriving incomplete. Every supplier is affected, the cheap ones worst of all. Whoever secures reliable delivery this quarter will be the one with product on the shelf when customers arrive.",
  },
  pricewar: {
    key: "pricewar", idx: 6, kind: "risk", label: "Price war", effect: "Customers care much more about price.",
    demandMult: 1, deliveryMult: 1, costMult: 1, priceSensitivity: 2, mktEff: 1,
    headline: "Discounting spreads as buyers chase the lowest tag",
    story: "Comparison shopping has taken over. Brand loyalty is thin, advertising bounces off, and customers sort almost purely by price. Undercutting rivals will win volume this quarter. The open question is whether anyone makes money doing it.",
  },
  inflation: {
    key: "inflation", idx: 7, kind: "neutral", label: "Inflation", effect: "Costs rise 15%, but buyers accept higher prices.",
    demandMult: 1, deliveryMult: 1, costMult: 1.15, priceSensitivity: 0.6, mktEff: 1,
    headline: "Prices rise everywhere, and shoppers shrug",
    story: "Input costs are up sharply, but so is everything else, and customers have stopped flinching at higher tags. Passing the increase on is easier than usual. Firms that absorb the cost to protect their price may find they gained nothing for it.",
  },
};
export const EVENT_LIST = Object.values(MARKET_EVENTS);
const EVENT_BY_IDX = {};
EVENT_LIST.forEach((e) => { EVENT_BY_IDX[e.idx] = e; });

/* ============================================================
   Codes. Three kinds, told apart by the first character:
   B = round code (instructor -> everyone, opens a round)
   T = decision code (team -> instructor)
   R = results code (instructor -> one team)
   Every code ends in a checksum character, so typos are caught.
   ============================================================ */

// Weights share no factor with 36, so changing any one character changes the checksum
// (the only blind spots are 0/x, 1/y, 2/z swaps, which are hard to confuse visually).
const WEIGHTS = [1, 5, 7, 11, 13, 17, 19, 23, 25, 29, 31, 35];
function checksum(s) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i) * WEIGHTS[i % WEIGHTS.length]) % 36;
  return sum.toString(36);
}
export function normalizeCode(s) { return String(s || "").toLowerCase().replace(/[^0-9a-z]/g, ""); }
export function chunkCode(c) { return (String(c).match(/.{1,4}/g) || []).join(" "); }
export function codeKind(s) { const c = normalizeCode(s); return c ? c[0] : ""; }

function fixed(n, w) {
  const max = Math.pow(36, w) - 1;
  const v = Math.max(0, Math.min(max, Math.round(n)));
  return v.toString(36).padStart(w, "0");
}
function signedFixed(n, w) {
  const maxAbs = Math.floor((Math.pow(36, w) - 2) / 2);
  const a = Math.min(maxAbs, Math.abs(Math.round(n)));
  return fixed(a * 2 + (n < 0 && a > 0 ? 1 : 0), w);
}
function readSigned(s) { const v = parseInt(s, 36); return (v % 2 === 1 ? -1 : 1) * Math.floor(v / 2); }
function seal(body) { return (body + checksum(body)).toUpperCase(); }

const KIND_NAMES = { b: "a round code", t: "a decision code", r: "a results code" };
function open(code, prefix) {
  const c = normalizeCode(code);
  if (!c) return { error: "Type the code first." };
  if (c[0] !== prefix) {
    const what = KIND_NAMES[c[0]];
    return { error: what ? `That's ${what}, not ${KIND_NAMES[prefix]}.` : `${KIND_NAMES[prefix][0].toUpperCase() + KIND_NAMES[prefix].slice(1)} starts with ${prefix.toUpperCase()}.` };
  }
  if (c.length < 3) return { error: "That code is too short." };
  const body = c.slice(0, -1);
  if (checksum(body) !== c.slice(-1)) return { error: "That code has a typo. Check each character and try again." };
  return { body: body.slice(1) };
}

/* ---- T: decision code, carries the round so stale codes are caught ---- */
export function encodeTrade(round, d) {
  const combined = ((round - 1) * 3 + SUPPLIERS[d.supplier].idx) * 2 + (d.negotiation === "accept" ? 1 : 0);
  const N = ((combined * 100000 + d.marketing) * 10000 + d.price) * 10000 + d.orderQty;
  return seal("t" + N.toString(36));
}
export function decodeTrade(code) {
  const o = open(code, "t");
  if (o.error) return o;
  const N = parseInt(o.body, 36);
  if (!Number.isSafeInteger(N)) return { error: "That code has a typo. Check each character and try again." };
  let n = N;
  const orderQty = n % 10000; n = Math.floor(n / 10000);
  const price = n % 10000; n = Math.floor(n / 10000);
  const marketing = n % 100000; n = Math.floor(n / 100000);
  const neg = n % 2; n = Math.floor(n / 2);
  const sup = n % 3;
  const round = Math.floor(n / 3) + 1;
  if (round > MAX_ROUNDS || price < 1) return { error: "That code has a typo. Check each character and try again." };
  return { round, decision: { supplier: SUP_BY_IDX[sup], orderQty, price, marketing, negotiation: neg ? "accept" : "decline" } };
}

/* ---- B: round code ---- */
export function encodeBriefing(round, eventKey) {
  const ev = MARKET_EVENTS[eventKey] || MARKET_EVENTS.none;
  return seal("b" + fixed(round, 1) + fixed(ev.idx, 1));
}
export function decodeBriefing(code) {
  const o = open(code, "b");
  if (o.error) return o;
  if (o.body.length !== 2) return { error: "That code has a typo. Check each character and try again." };
  const round = parseInt(o.body[0], 36);
  const ev = EVENT_BY_IDX[parseInt(o.body[1], 36)];
  if (!round || round > MAX_ROUNDS || !ev) return { error: "That code has a typo. Check each character and try again." };
  return { round, eventKey: ev.key };
}

/* ---- R: results code (fixed width: round 1, sold 3, lost 3, left 4, share 2, profit 5, cash 6) ---- */
export function encodeReport(r, cash) {
  return seal("r" + fixed(r.round, 1) + fixed(r.unitsSold, 3) + fixed(r.lostSales, 3) + fixed(r.leftover, 4)
    + fixed(Math.round(r.marketShare * 10), 2) + signedFixed(r.profit, 5) + signedFixed(cash, 6));
}
export function decodeReport(code) {
  const o = open(code, "r");
  if (o.error) return o;
  const b = o.body;
  if (b.length !== 24) return { error: "That code is incomplete. Results codes have 26 characters." };
  const round = parseInt(b.slice(0, 1), 36);
  if (!round || round > MAX_ROUNDS) return { error: "That code has a typo. Check each character and try again." };
  return {
    report: {
      round,
      unitsSold: parseInt(b.slice(1, 4), 36),
      lostSales: parseInt(b.slice(4, 7), 36),
      leftover: parseInt(b.slice(7, 11), 36),
      marketShare: parseInt(b.slice(11, 13), 36) / 10,
      profit: readSigned(b.slice(13, 18)),
      cash: readSigned(b.slice(18, 24)),
    },
  };
}

/* ============================================================
   Validation
   ============================================================ */
const isWhole = (s) => /^\d+$/.test(String(s).trim());

export function validateDraft(d) {
  if (String(d.qty).trim() === "") return { field: "qty", error: "Enter how many units to order." };
  if (!isWhole(d.qty)) return { field: "qty", error: "Use a whole number of units." };
  if (+d.qty > LIMITS.qty) return { field: "qty", error: `Order at most ${LIMITS.qty} units.` };
  if (String(d.price).trim() === "") return { field: "price", error: "Enter a selling price." };
  if (!isWhole(d.price) || +d.price < 1) return { field: "price", error: "Price must be a whole number of at least $1." };
  if (+d.price > LIMITS.price) return { field: "price", error: `Price can be at most $${LIMITS.price}.` };
  if (String(d.mkt).trim() === "") return { field: "mkt", error: "Enter a marketing budget. Zero is allowed." };
  if (!isWhole(d.mkt)) return { field: "mkt", error: "Use a whole number of dollars." };
  if (+d.mkt > LIMITS.mkt) return { field: "mkt", error: `Marketing can be at most $${LIMITS.mkt}.` };
  return { decision: { supplier: d.supplier, orderQty: +d.qty, price: +d.price, marketing: +d.mkt, negotiation: d.neg } };
}

export function validateSetup(teams, s) {
  const names = teams.map((t) => t.trim());
  if (names.length < 2) return "Add at least 2 teams.";
  if (names.length > LIMITS.teams) return `Use at most ${LIMITS.teams} teams.`;
  if (names.some((n) => !n)) return "Every team needs a name.";
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return "Two teams have the same name.";
  const chk = (v, lo, hi, label) => (!isWhole(v) || +v < lo || +v > hi ? `${label} must be a whole number from ${lo} to ${hi}.` : null);
  return chk(s.rounds, 1, MAX_ROUNDS, "Rounds")
    || chk(s.cash, 0, LIMITS.cash, "Starting cash")
    || chk(s.demand, 1, LIMITS.demand, "Round 1 demand")
    || chk(s.growth, 0, LIMITS.growth, "Growth per round")
    || null;
}

export function demandFor(settings, round, eventKey) {
  const ev = MARKET_EVENTS[eventKey] || MARKET_EVENTS.none;
  return Math.round((+settings.demand + +settings.growth * (round - 1)) * ev.demandMult);
}

/* ============================================================
   Market engine
   ============================================================ */
export function resolveRound(round, teams, decisions, carry, settings, eventKey) {
  const ev = MARKET_EVENTS[eventKey] || MARKET_EVENTS.none;
  const totalDemand = demandFor(settings, round, eventKey);
  const neg = NEGOTIATIONS[round];

  const prep = {};
  teams.forEach((t) => {
    const d = decisions[t];
    const sup = SUPPLIERS[d.supplier];
    let unitCost = sup.unitCost * ev.costMult;
    let guaranteed = 0, guaranteedRevenue = 0;
    const delivered = Math.round(d.orderQty * sup.reliability * ev.deliveryMult);
    if (neg && d.negotiation === "accept") {
      if (neg.type === "bulk" && d.orderQty >= neg.threshold) unitCost *= 1 - neg.discount;
      if (neg.type === "client") {
        guaranteed = Math.min(neg.units, delivered + (carry[t] || 0));
        guaranteedRevenue = guaranteed * d.price * (1 - neg.discount);
      }
    }
    const available = delivered + (carry[t] || 0);
    prep[t] = { d, orderCost: delivered * unitCost, forMarket: Math.max(0, available - guaranteed), guaranteed, guaranteedRevenue };
  });

  const avgPrice = teams.reduce((s, t) => s + prep[t].d.price, 0) / teams.length;
  const avgMkt = Math.max(1, teams.reduce((s, t) => s + prep[t].d.marketing, 0) / teams.length);
  const pull = {};
  let totalPull = 0;
  teams.forEach((t) => {
    const priceScore = Math.pow(avgPrice / Math.max(1, prep[t].d.price), ev.priceSensitivity);
    const mktScore = (prep[t].d.marketing / avgMkt) * ev.mktEff;
    pull[t] = Math.max(0.01, 0.6 * priceScore + 0.4 * mktScore);
    totalPull += pull[t];
  });

  const remaining = Math.max(0, totalDemand - teams.reduce((s, t) => s + prep[t].guaranteed, 0));
  const out = {};
  teams.forEach((t) => {
    const p = prep[t];
    const share = pull[t] / totalPull;
    const wanted = Math.round(remaining * share);
    const sold = Math.min(wanted, p.forMarket);
    const lost = Math.max(0, wanted - p.forMarket);
    const leftover = Math.max(0, p.forMarket - sold);
    const revenue = sold * p.d.price + p.guaranteedRevenue;
    const profit = revenue - p.orderCost - p.d.marketing - leftover * HOLDING_COST;
    out[t] = {
      round, totalDemand,
      unitsSold: sold + p.guaranteed, lostSales: lost, leftover,
      revenue: Math.round(revenue), profit: Math.round(profit),
      marketShare: Math.round(share * 1000) / 10,
      decision: p.d,
    };
  });
  return out;
}
