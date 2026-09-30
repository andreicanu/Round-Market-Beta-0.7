import * as L from "./logic.js";
const { useState, useEffect } = React;

/* ============================================================
   Browser persistence (per viewer). Survives refreshes.
   ============================================================ */
const KEYS = { team: "trm.team.v2", instructor: "trm.instructor.v2", view: "trm.view.v2" };
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: app still works for this visit */ } },
};
function usePersistent(key, initial) {
  const [v, setV] = useState(() => { const s = store.get(key); return s ? { ...initial, ...s } : initial; });
  useEffect(() => { store.set(key, v); }, [key, v]);
  return [v, setV];
}

/* ============================================================
   Small helpers
   ============================================================ */
const PATHS = {
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  check: "M5 12.5l4.5 4.5L19 7",
  back: "M15 18l-6-6 6-6",
  plus: "M12 5v14 M5 12h14",
  x: "M6 6l12 12 M18 6L6 18",
  alert: "M12 8v5 M12 16.5v.5 M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  screen: "M3 4h18v12H3z M8 20h8 M12 16v4",
  up: "M7 17L17 7 M9 7h8v8",
  down: "M7 7l10 10 M17 9v8H9",
};
function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
const money = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
const signedMoney = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const toneOf = (kind) => (kind === "bonus" ? "up" : kind === "risk" ? "down" : "warn");

function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  } catch (e) { /* fall through */ }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
function CopyButton({ text, label = "Copy", small }) {
  const [state, setState] = useState("idle");
  async function go() {
    const ok = await copyText(text);
    setState(ok ? "done" : "fail");
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <button type="button" className={"btn" + (small ? " btn-sm" : "")} onClick={go}>
      <Icon name={state === "done" ? "check" : "copy"} />
      {state === "done" ? "Copied" : state === "fail" ? "Select and copy manually" : label}
    </button>
  );
}

/* ============================================================
   App shell
   ============================================================ */
export function App() {
  const [view, setView] = useState(() => store.get(KEYS.view) || "home");
  useEffect(() => { store.set(KEYS.view, view); window.scrollTo(0, 0); }, [view]);
  if (view === "teacher") return <Instructor onExit={() => setView("home")} />;
  if (view === "team") return <Team onExit={() => setView("home")} />;
  if (view === "guide") return <Guide onBack={() => setView("home")} />;
  return <Home go={setView} />;
}

function Home({ go }) {
  const t = store.get(KEYS.team);
  const g = store.get(KEYS.instructor);
  const teamLine = t && t.name ? `Continue as ${t.name}` : "Make decisions and follow your results";
  const teacherLine = g && g.phase === "play" ? `Continue the game in round ${g.round}` : g && g.phase === "over" ? "See the final standings" : "Set up teams and open rounds";
  return (
    <main className="page page-narrow">
      <h1 className="title">The Round<br />Market</h1>
      <p className="lede">
        Teams run rival firms selling the same product on one shared market. Each round they choose a supplier,
        a price and a marketing budget, and the market decides who sells what.
      </p>
      <div className="roles">
        <button type="button" className="role" onClick={() => go("team")}>
          <span className="role-name">I'm on a team</span>
          <span className="role-desc">{teamLine}</span>
        </button>
        <button type="button" className="role" onClick={() => go("teacher")}>
          <span className="role-name">I'm running the game</span>
          <span className="role-desc">{teacherLine}</span>
        </button>
      </div>
      <button type="button" className="link" onClick={() => go("guide")}>How the game works</button>
    </main>
  );
}

/* ============================================================
   Guide
   ============================================================ */
function Guide({ onBack }) {
  return (
    <main className="page">
      <TopBar onBack={onBack} backLabel="Home" />
      <h1 className="h1">How the game works</h1>
      <p className="lede" style={{ marginTop: 10 }}>
        Every round, each team decides how much to buy, at what price to sell, and how much to spend on marketing.
        Total demand is split between teams by how attractive their offer is. Unsold stock carries over but costs $1 a unit
        to hold; running out sends customers to rivals. Highest cash at the end wins.
      </p>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2 className="h2">Three kinds of code carry the game</h2>
        <div className="codes-legend">
          <div><span className="code-chip warn">B</span><div><strong>Round code</strong><p className="muted small">The instructor shows it to everyone. It opens the round and its news.</p></div></div>
          <div><span className="code-chip accent">T</span><div><strong>Decision code</strong><p className="muted small">Each team sends theirs to the instructor. It holds the team's choices.</p></div></div>
          <div><span className="code-chip up">R</span><div><strong>Results code</strong><p className="muted small">The instructor gives each team their own. It updates the team's results.</p></div></div>
        </div>
      </section>

      <div className="cols" style={{ marginTop: 20 }}>
        <section className="panel">
          <h2 className="h2">For teams</h2>
          <ol className="steps-list">
            <li>Type your team name exactly as the instructor has it.</li>
            <li>Enter the round code when it's shown, then read the round's news.</li>
            <li>Pick a supplier and set units, price and marketing. Check the stock you already hold.</li>
            <li>Send your decision code to the instructor.</li>
            <li>Enter the results code you get back. Your results page updates.</li>
          </ol>
        </section>
        <section className="panel">
          <h2 className="h2">For the instructor</h2>
          <ol className="steps-list">
            <li>Add the teams and set the game length and market size.</li>
            <li>Each round, pick an event. Show the news and the round code to the class.</li>
            <li>Type in each team's decision code. Mistyped or old codes are flagged.</li>
            <li>Resolve the round, then share the results codes. One button copies them all for the class chat.</li>
            <li>Everything saves in this browser, so a refresh loses nothing.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

function TopBar({ onBack, backLabel = "Exit", children }) {
  return (
    <header className="topbar">
      <button type="button" className="btn btn-sm btn-quiet" onClick={onBack}><Icon name="back" /> {backLabel}</button>
      <span className="brand">The Round Market</span>
      <div className="topbar-end">{children}</div>
    </header>
  );
}

/* ============================================================
   Shared pieces
   ============================================================ */
function CodeEntry({ label, placeholder, onApply, help }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const id = "code-" + label.replace(/\W+/g, "-").toLowerCase();
  function submit(e) {
    e.preventDefault();
    const err = onApply(value);
    if (err) setError(err); else { setValue(""); setError(null); }
  }
  return (
    <form onSubmit={submit} className="code-entry" noValidate>
      <label htmlFor={id}>{label}</label>
      <div className="code-entry-row">
        <input id={id} className={"input input-code" + (error ? " bad" : "")} value={value} placeholder={placeholder}
          autoComplete="off" autoCapitalize="characters" spellCheck="false"
          aria-invalid={!!error} aria-describedby={error ? id + "-err" : undefined}
          onChange={(e) => { setValue(e.target.value); setError(null); }} />
        <button type="submit" className="btn btn-primary">Enter</button>
      </div>
      {error ? <p className="err" id={id + "-err"} role="alert"><Icon name="alert" size={14} /> {error}</p>
        : help ? <p className="hint">{help}</p> : null}
    </form>
  );
}

function Ticket({ tone, title, meta, code, children }) {
  return (
    <div className={"ticket ticket-" + tone}>
      <div className="ticket-head"><span className="ticket-title">{title}</span>{meta && <span className="muted small">{meta}</span>}</div>
      <div className="ticket-rule" />
      {code ? <div className="ticket-code" aria-label={code.split("").join(" ")}>{L.chunkCode(code)}</div> : null}
      {children}
    </div>
  );
}

function NewsCard({ round, eventKey, large }) {
  const ev = L.MARKET_EVENTS[eventKey] || L.MARKET_EVENTS.none;
  const neg = L.NEGOTIATIONS[round];
  return (
    <article className={"news tone-" + toneOf(ev.kind) + (large ? " news-lg" : "")}>
      <div className="news-top">
        <span className="muted small">Round {round} news</span>
        <span className="tag"><span className={"dot bg-" + toneOf(ev.kind)} />{ev.label}</span>
      </div>
      <h3 className="news-head">{ev.headline}</h3>
      <p className="news-body">{ev.story}</p>
      {neg && (
        <div className="news-offer">
          <strong>Also this round: {neg.title.toLowerCase()}.</strong> {neg.text}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, tone, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={"stat-value" + (tone ? " " + tone : "")}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function NumField({ id, label, value, onChange, error, hint, prefix }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={"affix" + (prefix ? " has-prefix" : "")}>
        {prefix && <span className="affix-pre" aria-hidden="true">{prefix}</span>}
        <input id={id} className={"input" + (error ? " bad" : "")} type="text" inputMode="numeric" value={value}
          aria-invalid={!!error} aria-describedby={error ? id + "-err" : hint ? id + "-hint" : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
      </div>
      {error ? <p className="err" id={id + "-err"}>{error}</p> : hint ? <p className="hint" id={id + "-hint"}>{hint}</p> : null}
    </div>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" className="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---- charts: each draws its own axis so labels line up with points and bars ---- */
const CW = 320, CH = 110, CP = 10;
function lineXs(n) { return Array.from({ length: n }, (_, i) => (n === 1 ? CW / 2 : CP + (i * (CW - CP * 2)) / (n - 1))); }
function barGeom(n) { const gap = 6; const bw = Math.max(4, (CW - CP * 2 - gap * (n - 1)) / n); return { bw, xs: Array.from({ length: n }, (_, i) => CP + i * (bw + gap)) }; }
function Axis({ rounds, centers }) {
  return (
    <div className="axis" aria-hidden="true">
      {rounds.map((r, i) => <span key={r} style={{ left: (centers[i] / CW) * 100 + "%" }}>R{r}</span>)}
    </div>
  );
}
function LineChart({ data, rounds, tone = "accent", label }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || Math.max(1, Math.abs(max));
  const lo = max === min ? min - span / 2 : min;
  const xs = lineXs(data.length);
  const pts = data.map((v, i) => [xs[i], CH - CP - ((v - lo) / span) * (CH - CP * 2)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)},${CH} L${pts[0][0].toFixed(1)},${CH} Z`;
  return (
    <>
      <svg className={"chart c-" + tone} viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={label}>
        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />
        {pts.map((p, i) => <circle key={i} className="chart-dot" cx={p[0]} cy={p[1]} r="3" />)}
      </svg>
      <Axis rounds={rounds} centers={xs} />
    </>
  );
}
function BarChart({ data, rounds, label, format }) {
  if (!data.length) return null;
  const maxAbs = Math.max(1, ...data.map((v) => Math.abs(v)));
  const hasNeg = data.some((v) => v < 0);
  const zero = hasNeg ? CH / 2 : CH - CP;
  const room = hasNeg ? CH / 2 - CP : CH - CP * 2;
  const { bw, xs } = barGeom(data.length);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={label}>
        <line className="chart-zero" x1={CP} x2={CW - CP} y1={zero} y2={zero} />
        {data.map((v, i) => {
          const bh = Math.max(1, (Math.abs(v) / maxAbs) * room);
          return (
            <rect key={i} className={v >= 0 ? "bar-up" : "bar-down"} x={xs[i]} y={v >= 0 ? zero - bh : zero} width={bw} height={bh} rx="2">
              <title>{`Round ${rounds[i]}: ${format ? format(v) : v}`}</title>
            </rect>
          );
        })}
      </svg>
      <Axis rounds={rounds} centers={xs.map((x) => x + bw / 2)} />
    </>
  );
}

/* ============================================================
   TEAM
   ============================================================ */
const TEAM_INIT = { name: "", round: null, eventKey: null, history: [], draft: { supplier: "S", qty: "100", price: "20", mkt: "200", neg: "decline" } };

function Team({ onExit }) {
  const [s, setS] = usePersistent(KEYS.team, TEAM_INIT);
  const [tab, setTab] = useState("round");
  const [notice, setNotice] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!s.name) return <TeamName onBack={onExit} onDone={(name) => setS({ ...s, name })} />;

  const last = s.history.length ? s.history[s.history.length - 1] : null;
  const finished = s.round !== null && s.history.some((h) => h.round === s.round);
  const deciding = s.round !== null && !finished;
  const stock = last ? last.leftover : 0;
  const nextRound = last ? last.round + 1 : 1;

  function apply(raw) {
    const kind = L.codeKind(raw);
    if (kind === "b") {
      const r = L.decodeBriefing(raw);
      if (r.error) return r.error;
      if (s.history.some((h) => h.round === r.round)) return `Round ${r.round} is already finished for your team.`;
      setS({ ...s, round: r.round, eventKey: r.eventKey, draft: { ...s.draft, neg: "decline" } });
      setTab("round");
      setNotice(`Round ${r.round} is open. Read the news, then make your decisions.`);
      return null;
    }
    if (kind === "r") {
      const r = L.decodeReport(raw);
      if (r.error) return r.error;
      if (s.history.some((h) => h.round === r.report.round)) return `You already entered the results for round ${r.report.round}.`;
      const history = [...s.history, r.report].sort((a, b) => a.round - b.round);
      const round = Math.max(s.round || 0, r.report.round);
      setS({ ...s, history, round, eventKey: round === s.round ? s.eventKey : null });
      setNotice(`Round ${r.report.round} results are in.`);
      return null;
    }
    if (kind === "t") return "That's your decision code. It goes to the instructor, not in here.";
    if (!kind) return "Type the code first.";
    return "Codes from the instructor start with B (round code) or R (results code).";
  }

  return (
    <main className="page page-mid">
      <TopBar onBack={onExit}>
        {confirmReset ? (
          <span className="confirm">
            <span className="small">Clear this team's data?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => { setS(TEAM_INIT); setConfirmReset(false); }}>Clear</button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirmReset(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirmReset(true)}>Change team</button>
        )}
      </TopBar>

      <h1 className="h1">{s.name}</h1>
      <div className="stats" style={{ marginTop: 14 }}>
        <Stat label="Round" value={s.round === null ? "—" : s.round} sub={deciding ? "in progress" : s.round ? "finished" : "not started"} />
        <Stat label="Cash" value={last ? money(last.cash) : "—"} sub={last ? `after round ${last.round}` : "after your first results"} />
        <Stat label="In stock" value={stock} sub={stock ? "carried over" : last ? "nothing left" : "none yet"} />
      </div>

      {notice && <p className="notice" role="status"><Icon name="check" size={15} /> {notice}</p>}

      <div style={{ margin: "20px 0" }}>
        <Tabs value={tab} onChange={setTab} items={[{ id: "round", label: "This round" }, { id: "results", label: `Results${s.history.length ? ` (${s.history.length})` : ""}` }]} />
      </div>

      {tab === "results" ? <TeamResults history={s.history} /> : deciding ? (
        <div className="stack">
          <NewsCard round={s.round} eventKey={s.eventKey || "none"} />
          <DecisionForm round={s.round} stock={stock} draft={s.draft} setDraft={(draft) => setS({ ...s, draft })} />
          <section className="panel">
            <h2 className="h2">Got your results?</h2>
            <CodeEntry label="Code from the instructor" placeholder="R… or B…" onApply={apply}
              help="Enter the results code (starts with R) when the instructor hands it out." />
          </section>
        </div>
      ) : (
        <div className="stack">
          {last && <LastRoundSummary r={last} />}
          <section className="panel panel-focus">
            <h2 className="h2">{s.round === null ? "Waiting for round 1" : `Waiting for round ${nextRound}`}</h2>
            <p className="muted" style={{ margin: "0 0 14px" }}>When the instructor shows the round code, type it here to open the round.</p>
            <CodeEntry label="Round code" placeholder="B…" onApply={apply} />
          </section>
        </div>
      )}
    </main>
  );
}

function TeamName({ onDone, onBack }) {
  const [v, setV] = useState("");
  return (
    <main className="page page-narrow">
      <TopBar onBack={onBack} backLabel="Home" />
      <h1 className="h1">What's your team called?</h1>
      <p className="muted" style={{ marginTop: 8 }}>Use exactly the name your instructor has, so the results codes you get are clearly yours.</p>
      <form className="stack" style={{ marginTop: 20 }} onSubmit={(e) => { e.preventDefault(); if (v.trim()) onDone(v.trim()); }}>
        <div className="field">
          <label htmlFor="team-name">Team name</label>
          <input id="team-name" className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder="Team 1" autoComplete="off" />
        </div>
        <div><button type="submit" className="btn btn-primary" disabled={!v.trim()}>Continue</button></div>
      </form>
    </main>
  );
}

function DecisionForm({ round, stock, draft, setDraft }) {
  const v = L.validateDraft(draft);
  const neg = L.NEGOTIATIONS[round];
  const sup = L.SUPPLIERS[draft.supplier];
  const set = (k, val) => setDraft({ ...draft, [k]: val });
  const d = v.decision;
  const arriving = d ? Math.round(d.orderQty * sup.reliability) : null;
  const spend = d ? Math.round(d.orderQty * sup.reliability * sup.unitCost + d.marketing) : null;
  const code = d ? L.encodeTrade(round, d) : null;

  return (
    <>
      <section className="panel">
        <h2 className="h2">Your decisions for round {round}</h2>

        <fieldset className="field">
          <legend>Supplier</legend>
          <div className="opts">
            {Object.values(L.SUPPLIERS).map((x) => (
              <label key={x.key} className={"opt" + (draft.supplier === x.key ? " on" : "")}>
                <input type="radio" name="supplier" checked={draft.supplier === x.key} onChange={() => set("supplier", x.key)} />
                <span className="opt-name">{x.label}</span>
                <span className="opt-note">{x.note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid3">
          <NumField id="qty" label="Units to order" value={draft.qty} onChange={(x) => set("qty", x)}
            error={v.field === "qty" ? v.error : null}
            hint={stock ? `You already hold ${stock} units.` : "You hold no stock yet."} />
          <NumField id="price" label="Price per unit" prefix="$" value={draft.price} onChange={(x) => set("price", x)}
            error={v.field === "price" ? v.error : null} />
          <NumField id="mkt" label="Marketing budget" prefix="$" value={draft.mkt} onChange={(x) => set("mkt", x)}
            error={v.field === "mkt" ? v.error : null} />
        </div>

        {neg && (
          <fieldset className="field offer">
            <legend>{neg.title}</legend>
            <p className="muted small" style={{ margin: "0 0 10px" }}>{neg.text}</p>
            <div className="radio-row">
              <label className="radio"><input type="radio" name="neg" checked={draft.neg === "accept"} onChange={() => set("neg", "accept")} /> {neg.accept}</label>
              <label className="radio"><input type="radio" name="neg" checked={draft.neg === "decline"} onChange={() => set("neg", "decline")} /> {neg.decline}</label>
            </div>
            {neg.type === "bulk" && draft.neg === "accept" && d && d.orderQty < neg.threshold && (
              <p className="err">You're ordering {d.orderQty}. The discount only applies from {neg.threshold} units.</p>
            )}
          </fieldset>
        )}

        {d && (
          <p className="estimate">
            About <strong>{arriving + stock}</strong> units to sell{stock ? ` (${arriving} arriving + ${stock} in stock)` : ""}.
            Spend before sales: <strong>{money(spend)}</strong>.
          </p>
        )}
      </section>

      <Ticket tone="accent" title="Your decision code" meta={`Round ${round}`} code={code}>
        {code ? (
          <div className="ticket-foot">
            <span className="muted small">Read it out or send it to the instructor.</span>
            <CopyButton text={code} label="Copy code" />
          </div>
        ) : (
          <p className="err" style={{ marginTop: 12 }}><Icon name="alert" size={14} /> {v.error}</p>
        )}
      </Ticket>
    </>
  );
}

function LastRoundSummary({ r }) {
  return (
    <section className="panel">
      <h2 className="h2">Round {r.round} results</h2>
      <div className="stats stats-4">
        <Stat label="Profit" value={signedMoney(r.profit)} tone={r.profit >= 0 ? "up" : "down"} />
        <Stat label="Units sold" value={r.unitsSold} />
        <Stat label="Market share" value={r.marketShare + "%"} />
        <Stat label="Stock left" value={r.leftover} />
      </div>
      <p className="muted small" style={{ margin: "12px 0 0" }}>
        {r.lostSales > 0
          ? `You ran out and missed ${r.lostSales} sales. Those customers went to rivals.`
          : r.leftover > 0 ? `You carry ${r.leftover} units into the next round, at $1 a unit to hold.` : "You sold everything you had, with no missed sales."}
      </p>
    </section>
  );
}

function TeamResults({ history }) {
  if (!history.length) {
    return (
      <section className="panel empty">
        <h2 className="h2">No results yet</h2>
        <p className="muted">After each round the instructor gives you a results code starting with R. Enter it on the This round tab and your figures appear here.</p>
      </section>
    );
  }
  const last = history[history.length - 1];
  const rounds = history.map((h) => h.round);
  const totalSold = history.reduce((a, h) => a + h.unitsSold, 0);
  const totalLost = history.reduce((a, h) => a + h.lostSales, 0);
  const best = history.reduce((a, b) => (b.profit > a.profit ? b : a));
  return (
    <div className="stack">
      <div className="stats stats-4">
        <Stat label="Cash" value={money(last.cash)} />
        <Stat label="Total units sold" value={totalSold} />
        <Stat label="Missed sales" value={totalLost} tone={totalLost ? "down" : undefined} />
        <Stat label="Best round" value={`Round ${best.round}`} sub={signedMoney(best.profit)} />
      </div>
      <div className="cols">
        <section className="panel">
          <div className="chart-head"><h2 className="h2">Cash</h2><span className="chart-now">{money(last.cash)}</span></div>
          <LineChart data={history.map((h) => h.cash)} rounds={rounds} tone="accent" label="Cash after each round" />
        </section>
        <section className="panel">
          <div className="chart-head"><h2 className="h2">Profit per round</h2><span className={"chart-now " + (last.profit >= 0 ? "up" : "down")}>{signedMoney(last.profit)}</span></div>
          <BarChart data={history.map((h) => h.profit)} rounds={rounds} format={signedMoney} label="Profit in each round" />
        </section>
      </div>
      <section className="panel">
        <div className="chart-head"><h2 className="h2">Market share</h2><span className="chart-now up">{last.marketShare}%</span></div>
        <LineChart data={history.map((h) => h.marketShare)} rounds={rounds} tone="up" label="Market share in each round" />
      </section>
      <section className="panel">
        <h2 className="h2">Round by round</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Round</th><th>Sold</th><th>Share</th><th>Missed</th><th>Left over</th><th>Profit</th><th>Cash</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.round}>
                  <td>{h.round}</td><td>{h.unitsSold}</td><td>{h.marketShare}%</td>
                  <td className={h.lostSales ? "down" : ""}>{h.lostSales}</td><td>{h.leftover}</td>
                  <td className={h.profit >= 0 ? "up" : "down"}>{signedMoney(h.profit)}</td><td>{money(h.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   INSTRUCTOR
   ============================================================ */
const INSTR_INIT = {
  phase: "setup", teams: ["Team 1", "Team 2", "Team 3", "Team 4"],
  settings: { rounds: "8", cash: "10000", demand: "400", growth: "20" },
  round: 1, stage: "open", eventKey: "none", codes: {}, cash: {}, carry: {}, history: [],
};

function Instructor({ onExit }) {
  const [g, setG] = usePersistent(KEYS.instructor, INSTR_INIT);
  const [present, setPresent] = useState(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const up = (patch) => setG((prev) => ({ ...prev, ...patch }));

  function newGame() { setG({ ...INSTR_INIT, teams: g.teams, settings: g.settings }); setConfirmNew(false); setPresent(null); }

  const menu = g.phase !== "setup" ? (
    confirmNew ? (
      <span className="confirm">
        <span className="small">End this game?</span>
        <button type="button" className="btn btn-sm btn-danger" onClick={newGame}>End game</button>
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirmNew(false)}>Keep playing</button>
      </span>
    ) : <button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirmNew(true)}>New game</button>
  ) : null;

  return (
    <main className="page">
      <TopBar onBack={onExit}>{menu}</TopBar>
      {g.phase === "setup" && <Setup g={g} up={up} />}
      {g.phase === "play" && <RoundView g={g} up={up} setPresent={setPresent} />}
      {g.phase === "over" && <GameOver g={g} setPresent={setPresent} onNew={() => setConfirmNew(true)} />}
      {present && <Present mode={present} g={g} onClose={() => setPresent(null)} />}
    </main>
  );
}

function Setup({ g, up }) {
  const [error, setError] = useState(null);
  const s = g.settings;
  const setS = (k, v) => up({ settings: { ...s, [k]: v } });
  const n = Math.min(Math.max(+s.rounds || 0, 0), L.MAX_ROUNDS);

  function start() {
    const err = L.validateSetup(g.teams, s);
    if (err) { setError(err); return; }
    const teams = g.teams.map((t) => t.trim());
    const cash = {}, carry = {};
    teams.forEach((t) => { cash[t] = +s.cash; carry[t] = 0; });
    up({ phase: "play", teams, round: 1, stage: "open", eventKey: "none", codes: {}, cash, carry, history: [] });
  }

  return (
    <>
      <h1 className="h1">Set up the game</h1>
      <p className="muted" style={{ marginTop: 8 }}>Everything here saves in this browser as you type.</p>
      <div className="cols" style={{ marginTop: 20 }}>
        <section className="panel">
          <h2 className="h2">Teams</h2>
          <div className="stack-sm">
            {g.teams.map((t, i) => (
              <div key={i} className="team-edit">
                <label className="sr" htmlFor={"team-" + i}>Team {i + 1} name</label>
                <input id={"team-" + i} className="input" value={t}
                  onChange={(e) => { const teams = [...g.teams]; teams[i] = e.target.value; up({ teams }); setError(null); }} />
                <button type="button" className="btn btn-icon btn-quiet" aria-label={`Remove ${t || "team"}`} disabled={g.teams.length <= 2}
                  onClick={() => up({ teams: g.teams.filter((_, j) => j !== i) })}><Icon name="x" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} disabled={g.teams.length >= L.LIMITS.teams}
            onClick={() => up({ teams: [...g.teams, `Team ${g.teams.length + 1}`] })}><Icon name="plus" /> Add team</button>
          <p className="hint">Teams type their own name in their app, so tell them these exact names. 5 to 8 teams works best.</p>
        </section>

        <section className="panel">
          <h2 className="h2">Game settings</h2>
          <div className="grid2">
            <NumField id="rounds" label="Rounds" value={s.rounds} onChange={(v) => setS("rounds", v)} hint={`Up to ${L.MAX_ROUNDS}. Eight fits a normal seminar.`} />
            <NumField id="cash" label="Starting cash" prefix="$" value={s.cash} onChange={(v) => setS("cash", v)} hint="What each team begins with." />
            <NumField id="demand" label="Round 1 demand" value={s.demand} onChange={(v) => setS("demand", v)} hint="Units the whole market buys in round 1." />
            <NumField id="growth" label="Growth per round" value={s.growth} onChange={(v) => setS("growth", v)} hint="Units added to demand each round. 0 keeps it flat." />
          </div>
          {n > 0 && (
            <div className="preview">
              <div className="small muted" style={{ marginBottom: 6 }}>Market demand by round, before events</div>
              <div className="preview-row">
                {Array.from({ length: n }, (_, i) => (
                  <span key={i}><span className="muted">R{i + 1}</span> {(+s.demand || 0) + (+s.growth || 0) * i}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      {error && <p className="err" role="alert" style={{ marginTop: 16 }}><Icon name="alert" size={14} /> {error}</p>}
      <div style={{ marginTop: 20 }}><button type="button" className="btn btn-primary btn-lg" onClick={start}>Start round 1</button></div>
    </>
  );
}

const STAGES = [{ id: "open", label: "Open the round" }, { id: "collect", label: "Collect decisions" }, { id: "results", label: "Share results" }];

function RoundView({ g, up, setPresent }) {
  const rounds = +g.settings.rounds;
  const idx = STAGES.findIndex((x) => x.id === g.stage);
  return (
    <>
      <div className="round-head">
        <h1 className="h1">Round {g.round} <span className="muted h1-sub">of {rounds}</span></h1>
        <span className="muted">Market demand this round: <strong className="num">{L.demandFor(g.settings, g.round, g.eventKey)}</strong> units</span>
      </div>
      <ol className="stepper" aria-label="Round progress">
        {STAGES.map((st, i) => (
          <li key={st.id} className={i < idx ? "done" : i === idx ? "now" : ""} aria-current={i === idx ? "step" : undefined}>
            <span className="stepper-n">{i < idx ? <Icon name="check" size={13} /> : i + 1}</span>{st.label}
          </li>
        ))}
      </ol>
      {g.stage === "open" && <StageOpen g={g} up={up} setPresent={setPresent} />}
      {g.stage === "collect" && <StageCollect g={g} up={up} />}
      {g.stage === "results" && <StageResults g={g} up={up} setPresent={setPresent} />}
    </>
  );
}

function StageOpen({ g, up, setPresent }) {
  const code = L.encodeBriefing(g.round, g.eventKey);
  return (
    <>
      <div className="cols">
        <section className="panel">
          <h2 className="h2">Pick this round's event</h2>
          <div className="events" role="radiogroup" aria-label="Market event">
            {L.EVENT_LIST.map((ev) => (
              <button key={ev.key} type="button" role="radio" aria-checked={g.eventKey === ev.key}
                className={"event" + (g.eventKey === ev.key ? " on" : "")} onClick={() => up({ eventKey: ev.key })}>
                <span className={"dot bg-" + toneOf(ev.kind)} />
                <span><span className="event-name">{ev.label}</span><span className="event-desc">{ev.effect}</span></span>
              </button>
            ))}
          </div>
        </section>
        <div className="stack">
          <section className="panel"><NewsCard round={g.round} eventKey={g.eventKey} /></section>
          <Ticket tone="warn" title="Round code" meta="Show this to everyone" code={code}>
            <div className="ticket-foot">
              <button type="button" className="btn" onClick={() => setPresent("news")}><Icon name="screen" /> Show on screen</button>
              <CopyButton text={code} />
            </div>
          </Ticket>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => up({ stage: "collect" })}>Next: collect decisions</button>
      </div>
    </>
  );
}

function rowState(raw, round) {
  if (!raw || !raw.trim()) return { status: "empty" };
  const r = L.decodeTrade(raw);
  if (r.error) return { status: "bad", text: r.error };
  if (r.round !== round) return { status: "bad", text: `This code is from round ${r.round}. Ask the team for their round ${round} code.` };
  const d = r.decision;
  const neg = L.NEGOTIATIONS[round];
  const text = `${L.SUPPLIERS[d.supplier].label}, ${d.orderQty} units, $${d.price} each, $${d.marketing} marketing` + (neg ? (d.negotiation === "accept" ? ", takes the offer" : ", turns down the offer") : "");
  return { status: "ok", text, decision: d };
}

function StageCollect({ g, up }) {
  const [error, setError] = useState(null);
  const states = {};
  g.teams.forEach((t) => { states[t] = rowState(g.codes[t], g.round); });
  const ready = g.teams.filter((t) => states[t].status === "ok").length;
  const allReady = ready === g.teams.length;

  function resolve() {
    if (!allReady) { setError("Every team needs a valid decision code before the round can be resolved."); return; }
    const decisions = {};
    g.teams.forEach((t) => { decisions[t] = states[t].decision; });
    const results = L.resolveRound(g.round, g.teams, decisions, g.carry, g.settings, g.eventKey);
    const cash = { ...g.cash }, carry = { ...g.carry };
    g.teams.forEach((t) => { cash[t] = (cash[t] || 0) + results[t].profit; carry[t] = results[t].leftover; });
    up({ cash, carry, history: [...g.history, { round: g.round, eventKey: g.eventKey, results, cashAfter: cash }], stage: "results" });
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2 className="h2" style={{ margin: 0 }}>Decision codes</h2>
          <span className={"count" + (allReady ? " up" : "")}>{ready} of {g.teams.length} in</span>
        </div>
        <div className="rows">
          {g.teams.map((t) => {
            const st = states[t];
            const id = "code-" + t.replace(/\W+/g, "-");
            return (
              <div key={t} className="row">
                <label className="row-name" htmlFor={id}>{t}</label>
                <div>
                  <input id={id} className={"input input-code" + (st.status === "bad" ? " bad" : st.status === "ok" ? " good" : "")}
                    placeholder="T…" value={g.codes[t] || ""} autoComplete="off" autoCapitalize="characters" spellCheck="false"
                    onChange={(e) => { up({ codes: { ...g.codes, [t]: e.target.value } }); setError(null); }} />
                  {st.status === "bad" && <p className="err">{st.text}</p>}
                  {st.status === "ok" && <p className="hint ok-text"><Icon name="check" size={13} /> {st.text}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {error && <p className="err" role="alert" style={{ marginTop: 14 }}><Icon name="alert" size={14} /> {error}</p>}
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={() => up({ stage: "open" })}><Icon name="back" /> Back to the event</button>
        <button type="button" className="btn btn-primary btn-lg" onClick={resolve} disabled={!allReady}>Resolve round {g.round}</button>
      </div>
    </>
  );
}

function Standings({ g, big }) {
  const last = g.history[g.history.length - 1];
  const ranked = [...g.teams].sort((a, b) => (g.cash[b] || 0) - (g.cash[a] || 0));
  return (
    <ol className={"board" + (big ? " board-lg" : "")}>
      {ranked.map((t, i) => {
        const p = last ? last.results[t].profit : null;
        return (
          <li key={t} className={"board-row" + (i === 0 ? " first" : "")}>
            <span className="rank">{i + 1}</span>
            <span className="board-name">{t}</span>
            {p !== null ? <span className={"board-delta " + (p >= 0 ? "up" : "down")}>{signedMoney(p)}</span> : <span />}
            <span className="board-cash">{money(g.cash[t] || 0)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StageResults({ g, up, setPresent }) {
  const last = g.history[g.history.length - 1];
  const rounds = +g.settings.rounds;
  const isLast = g.round >= rounds;
  const codes = g.teams.map((t) => ({ t, code: L.encodeReport(last.results[t], last.cashAfter[t]) }));
  const allText = `Round ${last.round} results codes\n` + codes.map((c) => `${c.t}: ${L.chunkCode(c.code)}`).join("\n");

  function next() {
    if (isLast) up({ phase: "over" });
    else up({ round: g.round + 1, stage: "open", eventKey: "none", codes: {} });
  }

  return (
    <>
      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <h2 className="h2" style={{ margin: 0 }}>Results codes</h2>
            <CopyButton text={allText} label="Copy all for the class chat" small />
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>Each team enters their own code to update their results page.</p>
          <ul className="report-list">
            {codes.map((c) => (
              <li key={c.t}>
                <span className="report-team">{c.t}</span>
                <span className="report-code">{L.chunkCode(c.code)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2 className="h2" style={{ margin: 0 }}>Standings</h2>
            <button type="button" className="btn btn-sm" onClick={() => setPresent("standings")}><Icon name="screen" /> Show on screen</button>
          </div>
          <Standings g={g} />
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h2 className="h2" style={{ margin: 0 }}>Round {last.round} in detail</h2>
          <span className="tag"><span className={"dot bg-" + toneOf(L.MARKET_EVENTS[last.eventKey].kind)} />{L.MARKET_EVENTS[last.eventKey].label}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Team</th><th>Sold</th><th>Share</th><th>Missed</th><th>Left over</th><th>Profit</th></tr></thead>
            <tbody>
              {g.teams.map((t) => {
                const r = last.results[t];
                return (
                  <tr key={t}>
                    <td>{t}</td><td>{r.unitsSold}</td><td>{r.marketShare}%</td>
                    <td className={r.lostSales ? "down" : ""}>{r.lostSales}</td><td>{r.leftover}</td>
                    <td className={r.profit >= 0 ? "up" : "down"}>{signedMoney(r.profit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={next}>{isLast ? "Finish the game" : `Open round ${g.round + 1}`}</button>
      </div>
    </>
  );
}

function GameOver({ g, setPresent, onNew }) {
  const ranked = [...g.teams].sort((a, b) => (g.cash[b] || 0) - (g.cash[a] || 0));
  return (
    <>
      <p className="muted" style={{ margin: 0 }}>Final standings after {g.history.length} rounds</p>
      <h1 className="title title-sm">{ranked[0]} wins</h1>
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h2 className="h2" style={{ margin: 0 }}>Standings</h2>
          <button type="button" className="btn btn-sm" onClick={() => setPresent("standings")}><Icon name="screen" /> Show on screen</button>
        </div>
        <Standings g={g} />
      </section>
      <div className="actions"><button type="button" className="btn" onClick={onNew}>Start a new game</button></div>
    </>
  );
}

function Present({ mode, g, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const code = L.encodeBriefing(g.round, g.eventKey);
  return (
    <div className="present" role="dialog" aria-modal="true" aria-label="Presentation view">
      <button type="button" className="btn present-close" onClick={onClose}><Icon name="x" /> Close</button>
      {mode === "news" ? (
        <div className="present-inner">
          <NewsCard round={g.round} eventKey={g.eventKey} large />
          <div className="present-code">
            <span className="muted">Round code</span>
            <span className="big-code">{L.chunkCode(code)}</span>
          </div>
        </div>
      ) : (
        <div className="present-inner">
          <p className="muted present-kicker">{g.phase === "over" ? "Final standings" : `Standings after round ${g.history.length}`}</p>
          <Standings g={g} big />
        </div>
      )}
    </div>
  );
}
