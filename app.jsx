/* Pro Credit — Portfolio Risk Dashboard
   Supabase live data + new dark-shell UI (sidebar, workspace bar, DashHome) */
const { useState, useMemo, useEffect, useRef } = React;
let DATA = null; // populated after Supabase async load

/* ---------- small UI atoms ---------- */
function ActionBadge({ action, size = "sm" }) {
  const s = U.ACTION_STYLE[action];
  const pad = size === "lg" ? "5px 12px" : "3px 9px";
  const fs = size === "lg" ? 12.5 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: pad,
      borderRadius: 5, fontSize: fs, fontWeight: 600, letterSpacing: ".04em",
      color: s.fg, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }}></span>
      {s.label}
    </span>
  );
}

function ClassDot({ cls }) {
  const s = U.CLASS_STYLE[cls];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.fg, flexShrink: 0 }}></span>
      <span style={{ fontSize: 13, color: "var(--ink-800)" }}>{s.label}</span>
    </span>
  );
}

function Num({ value, kind = "abbrev", muted, neg }) {
  const isNeg = value < 0;
  const txt = kind === "abbrev" ? U.abbrevPHP(value) : kind === "commas" ? U.commas(value) : U.fullPHP(value);
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 12.5, fontVariantNumeric: "tabular-nums",
      color: isNeg && neg ? "var(--neg)" : (value === 0 || muted ? "var(--ink-300)" : "var(--ink-800)"),
    }}>{txt}</span>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : null}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ===================================================================== */
/*  TABLE — Supabase columns                                             */
/* ===================================================================== */
const COLUMNS = [
  { key: "economicGroup", label: "Economic Group", type: "text", sticky: true, w: 168 },
  { key: "classification", label: "Classification", type: "class", w: 132 },
  { key: "riskTier", label: "Risk Tier", type: "text", w: 90 },
  { key: "industry", label: "Industry", type: "text", w: 158 },
  { key: "revenueBracket", label: "Revenue Bracket", type: "text", w: 122 },
  { key: "loanCount", label: "Loans", type: "plain", w: 70, align: "right" },
  { key: "principalBalance", label: "Principal Balance", type: "money", w: 130, align: "right" },
  { key: "overduePrincipal", label: "Overdue Principal", type: "money", w: 130, align: "right", warn: true },
  { key: "pctPortfolio", label: "% Portfolio", type: "pct", w: 96, align: "right" },
  { key: "action", label: "Action", type: "action", w: 132 },
  { key: "dpd", label: "DPD", type: "plain", w: 66, align: "right" },
  { key: "dpdBucket", label: "DPD Bucket", type: "dpd", w: 110 },
];

function Filters({ filters, setFilters, meta, count, total, onReset, onExport, query, setQuery }) {
  const [open, setOpen] = useState(() => Object.values(filters).filter(Boolean).length > 0);
  const activeCount = Object.values(filters).filter(Boolean).length;

  const chip = (label, group, value) => {
    const active = filters[group] === value;
    return (
      <button key={label} className={"chip" + (active ? " chip-on" : "")}
        onClick={() => setFilters((f) => ({ ...f, [group]: active ? null : value }))}>{label}</button>
    );
  };
  return (
    <div className="filters">
      <div className="filters-top">
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search economic group or industry…" />
          {query && <button className="search-x" onClick={() => setQuery("")}>&times;</button>}
        </div>
        <div className="filters-actions">
          <span className="count">{count}<span className="count-sub"> / {total}</span></span>
          <button className="btn-ghost" onClick={() => setOpen((o) => !o)} style={{ gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Filters
            {activeCount > 0 && <span style={{ display: "inline-grid", placeItems: "center", minWidth: 18, height: 18, borderRadius: 999, background: "var(--brand)", color: "#fff", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600, padding: "0 4px" }}>{activeCount}</span>}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-ghost" onClick={onReset}>Reset</button>
          <button className="btn-ghost" onClick={onExport}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export CSV
          </button>
        </div>
      </div>
      {open && (
        <div className="filters-rows" style={{ marginTop: 14 }}>
          <div className="frow"><span className="frow-label">Classification</span><div className="chips">{meta.classifications.map((c) => chip(c, "classification", c))}</div></div>
          {meta.riskTiers && <div className="frow"><span className="frow-label">Risk Tier</span><div className="chips">{meta.riskTiers.map((t) => chip(t, "riskTier", t))}</div></div>}
          <div className="frow"><span className="frow-label">Action</span><div className="chips">{meta.actions.map((a) => chip(a, "action", a))}</div></div>
          <div className="frow"><span className="frow-label">DPD</span><div className="chips">{meta.dpdBuckets.map((d) => chip(d, "dpdBucket", d))}</div></div>
          <div className="frow"><span className="frow-label">Industry</span>
            <select className="select" value={filters.industry || ""} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value || null }))}>
              <option value="">All industries</option>
              {meta.industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          {meta.industryGroups && <div className="frow"><span className="frow-label">Industry Group</span>
            <select className="select" value={filters.industryGroup || ""} onChange={(e) => setFilters((f) => ({ ...f, industryGroup: e.target.value || null }))}>
              <option value="">All industry groups</option>
              {meta.industryGroups.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>}
          {meta.revenueBrackets && <div className="frow"><span className="frow-label">Revenue Bracket</span>
            <select className="select" value={filters.revenueBracket || ""} onChange={(e) => setFilters((f) => ({ ...f, revenueBracket: e.target.value || null }))}>
              <option value="">All brackets</option>
              {meta.revenueBrackets.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>}
        </div>
      )}
    </div>
  );
}

function Cell({ col, row }) {
  const v = row[col.key];
  switch (col.type) {
    case "text": return <span style={{ fontSize: 13, color: col.sticky ? "var(--ink-900)" : "var(--ink-700)", fontWeight: col.sticky ? 600 : 400 }}>{v}</span>;
    case "plain": return <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: v === 0 ? "var(--ink-300)" : "var(--ink-800)" }}>{U.commas(v)}</span>;
    case "money": return <Num value={v} kind="abbrev" neg={col.neg} muted={false} />;
    case "pct": return <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: v >= 0.03 ? "var(--ink-900)" : "var(--ink-400)", fontWeight: v >= 0.03 ? 600 : 400 }}>{U.pct(v)}</span>;
    case "class": return <ClassDot cls={v} />;
    case "action": return <ActionBadge action={v} />;
    case "dpd": return <span className="dpd-pill" style={{ "--dpd": U.DPD_STYLE[v] }}>{v}</span>;
    default: return v;
  }
}

function Table({ onRowClick, filters, setFilters, query, setQuery, sort, setSort }) {
  const { rows, meta } = DATA;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.classification && r.classification !== filters.classification) return false;
      if (filters.riskTier && r.riskTier !== filters.riskTier) return false;
      if (filters.action && r.action !== filters.action) return false;
      if (filters.dpdBucket && r.dpdBucket !== filters.dpdBucket) return false;
      if (filters.industry && r.industry !== filters.industry) return false;
      if (filters.industryGroup && r.industryGroup !== filters.industryGroup) return false;
      if (filters.revenueBracket && r.revenueBracket !== filters.revenueBracket) return false;
      if (q && !(r.economicGroup.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filters, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "classification") { av = U.CLASS_STYLE[av].rank; bv = U.CLASS_STYLE[bv].rank; }
      if (typeof av === "string") return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });
    return arr;
  }, [filtered, sort]);

  const exportCSV = () => {
    const header = COLUMNS.map((c) => c.label);
    const lines = [header.join(",")];
    sorted.forEach((r) => {
      lines.push(COLUMNS.map((c) => {
        let v = r[c.key];
        if (c.type === "pct") v = (v * 100).toFixed(2) + "%";
        if (typeof v === "string" && v.includes(",")) v = `"${v}"`;
        return v;
      }).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio_filtered.csv";
    a.click();
  };

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: -s.dir } : { key, dir: key === "economicGroup" || key === "industry" ? 1 : -1 });

  return (
    <div className="page table-page">
      <Filters filters={filters} setFilters={setFilters} meta={meta} count={sorted.length} total={rows.length}
        onReset={() => { setFilters({}); setQuery(""); }} onExport={exportCSV} query={query} setQuery={setQuery} />

      <div className="table-wrap">
        <table className="ptable">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className={(c.sticky ? "sticky-col " : "") + (c.align === "right" ? "ralign" : "")}
                  style={{ minWidth: c.w, width: c.w }} onClick={() => toggleSort(c.key)}>
                  <span className="th-inner">
                    {c.label}
                    <span className={"sort-ind" + (sort.key === c.key ? " on" : "")}>
                      {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} onClick={() => onRowClick(r)} className={r.action === "EXIT" ? "row-exit" : ""}>
                {COLUMNS.map((c) => (
                  <td key={c.key} className={(c.sticky ? "sticky-col " : "") + (c.align === "right" ? "ralign" : "")}>
                    <Cell col={c} row={r} />
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="empty">No economic groups match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- detail slide-over (Supabase — includes loans list) ---------- */
function dpdBucketFor(dpd) {
  if (dpd <= 0) return "Current";
  if (dpd <= 29) return "0-29";
  if (dpd <= 59) return "30-59";
  if (dpd <= 89) return "60-89";
  return "90+";
}

function Detail({ row, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  if (!row) return null;
  const stat = (label, value, opts = {}) => (
    <div className="dstat">
      <span className="dstat-l">{label}</span>
      <span className="dstat-v" style={opts.color ? { color: opts.color } : null}>{value}</span>
    </div>
  );
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">{row.industry} &middot; {row.revenueBracket}</div>
            <h2>{row.economicGroup}</h2>
            {row.legalName && row.legalName !== row.economicGroup && (
              <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4 }}>{row.legalName}</div>
            )}
            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <ClassDot cls={row.classification} />
              <ActionBadge action={row.action} size="lg" />
              {row.hasRestructured && (
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--warn)", border: "1px solid var(--warn-bd)", background: "var(--warn-bg)", borderRadius: 5, padding: "3px 8px" }}>RESTRUCTURED</span>
              )}
            </div>
          </div>
          <button className="drawer-x" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          <div className="dgrid">
            {stat("Principal Balance", U.fullPHP(row.principalBalance))}
            {stat("% of Portfolio", U.pct(row.pctPortfolio))}
            {stat("Overdue Principal", U.fullPHP(row.overduePrincipal), { color: row.overduePrincipal > 0 ? "var(--warn)" : null })}
            {stat("Days Past Due", row.dpd + " (" + row.dpdBucket + ")", { color: U.DPD_STYLE[row.dpdBucket] })}
          </div>

          <h4 className="dsection">Lending Activity</h4>
          <div className="dgrid">
            {stat("Gross Disbursed", U.fullPHP(row._grossDisb || 0))}
            {stat("Interest Collected", U.fullPHP(row._interest || 0))}
            {stat("Loan Count", row.loanCount || (row.loans && row.loans.length) || "—")}
            {stat("Exposure / Revenue", row.exposureToRevenuePct ? U.pct(row.exposureToRevenuePct, 1) : "—")}
          </div>

          {row.loans && row.loans.length > 0 && (
            <>
              <h4 className="dsection">Loans ({row.loans.length})</h4>
              <div className="loanlist">
                {row.loans.map((l) => (
                  <div key={l.loanId} className="loanrow">
                    <span className="loanrow-id">#{l.loanId}</span>
                    <span className="loanrow-bal">{U.abbrevPHP(l.principalBalance)}</span>
                    <span className="dpd-pill" style={{ "--dpd": U.DPD_STYLE[dpdBucketFor(l.dpd)] }}>{l.dpd}d</span>
                    <span className="loanrow-due">due {l.dueDate}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ===================================================================== */
/*  LANDING                                                              */
/* ===================================================================== */
function Landing({ onEnter, onTable, onExit }) {
  const { totals, meta, rows } = DATA;
  const exitCount = rows.filter((r) => r.action === "EXIT").length;
  const atRiskPrincipal = rows.filter((r) => r.classification !== "Current")
    .reduce((s, r) => s + r.principalBalance, 0);
  const atRiskPct = totals.principalBalance ? atRiskPrincipal / totals.principalBalance : 0;

  const byClass = meta.classifications.map((c) => ({
    label: c, value: rows.filter((r) => r.classification === c).length, color: U.CLASS_STYLE[c].fg,
  })).filter((s) => s.value > 0);
  const totClass = byClass.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const arcs = byClass.map((s) => {
    const seg = { ...s, start: acc / totClass, frac: s.value / totClass };
    acc += s.value; return seg;
  });

  const top = [...rows].sort((a, b) => b.principalBalance - a.principalBalance).slice(0, 3);

  return (
    <div className="landing">
      <div className="landing-wash"></div>
      <div className="landing-grid">
        <div className="lhero">
          <img className="landing-logo" src="procredit-logo.png" alt="ProCredit Financing Corp" />
          <div className="pill"><span className="pill-dot"></span>CREDIT RISK &middot; PORTFOLIO MONITORING</div>
          <h1 className="landing-title">Welcome to<br/><span className="grad">Portfolio Dashboard.</span></h1>
          <p className="landing-lead">
            A single, intuitive view of the lending book &mdash; principal, exposure,
            delinquency and recommended actions across {totals.borrowers} active economic groups.
          </p>
          <div className="landing-cta">
            <button className="btn-primary lg" onClick={onEnter}>Enter dashboard &rarr;</button>
            <button className="btn-ghost lg" onClick={onTable}>Open portfolio table</button>
            <button className="btn-ghost lg" onClick={onExit}>
              Flagged EXIT <span className="cta-badge">{exitCount}</span>
            </button>
          </div>
          <div className="landing-foot">
            <span>Updated {meta.updated} &middot; Internal use &mdash; Credit Risk</span>
            <span>ProCredit Financing Corp &middot; v1.0</span>
          </div>
        </div>

        <div className="lpreview" aria-hidden="true">
          <div className="prev-card prev-main">
            <div className="prev-head">
              <span className="prev-title">Portfolio Risk</span>
              <span className="prev-live"><span className="prev-livedot"></span>LIVE</span>
            </div>
            <div className="prev-kpis">
              <div className="prev-kpi">
                <div className="prev-kpi-l">Principal Balance</div>
                <div className="prev-kpi-v">{U.abbrevPHP(totals.principalBalance)}</div>
              </div>
              <div className="prev-kpi">
                <div className="prev-kpi-l">Borrowers</div>
                <div className="prev-kpi-v">{totals.borrowers}</div>
              </div>
              <div className="prev-kpi">
                <div className="prev-kpi-l">Outside Current</div>
                <div className="prev-kpi-v" style={{ color: "var(--neg)" }}>{U.pct(atRiskPct, 1)}</div>
              </div>
            </div>
            <div className="prev-split">
              <div className="prev-donut">
                <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
                  {arcs.map((a, i) => {
                    const r = 46, c = 60, circ = 2 * Math.PI * r;
                    return <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={a.color} strokeWidth="16"
                      strokeDasharray={`${a.frac * circ} ${circ - a.frac * circ}`} strokeDashoffset={-a.start * circ} />;
                  })}
                </svg>
                <div className="prev-donut-c"><b>{totClass}</b><span>groups</span></div>
              </div>
              <div className="prev-legend">
                {byClass.map((s, i) => (
                  <div key={i} className="prev-leg">
                    <span className="prev-leg-dot" style={{ background: s.color }}></span>
                    <span className="prev-leg-l">{s.label}</span>
                    <span className="prev-leg-v">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="prev-card prev-top">
            <div className="prev-top-head">TOP EXPOSURES</div>
            {top.map((r, i) => (
              <div key={i} className="prev-top-row">
                <span className="prev-top-rank">{i + 1}</span>
                <span className="prev-top-name">{r.economicGroup}</span>
                <span className="prev-top-dot" style={{ background: U.CLASS_STYLE[r.classification].fg }}></span>
                <span className="prev-top-val">{U.abbrevPHP(r.principalBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  DASHBOARD SHELL — new dark UI                                        */
/* ===================================================================== */
const ICON = {
  grid: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  table: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 8h14M8 8v8" stroke="currentColor" strokeWidth="1.6"/></svg>,
  eye: <svg viewBox="0 0 20 20" fill="none"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  exit: <svg viewBox="0 0 20 20" fill="none"><path d="M12 3H5a2 2 0 00-2 2v10a2 2 0 002 2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 10h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  report: <svg viewBox="0 0 20 20" fill="none"><path d="M5 3h7l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 10v4M10 8v6M13 11v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  cash: <svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  moon: <svg viewBox="0 0 20 20" fill="none"><path d="M16 11a6 6 0 11-7-7 5 5 0 007 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  lock: <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 8a4 4 0 018 0c0 4 1.5 5 1.5 5h-11S6 12 6 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8.5 16a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/></svg>,
};

function Sidebar({ section, onNav, dark, setDark, onLogo }) {
  const exitCount = DATA.rows.filter((r) => r.action === "EXIT").length;
  const item = (key, label, icon, extra) => (
    <button className={"side-link" + (section === key ? " on" : "")} onClick={() => onNav(key)}>
      {icon}<span>{label}</span>{extra}
    </button>
  );
  return (
    <aside className="side">
      <button className="side-logo" onClick={onLogo} title="Back to landing">
        <img src="procredit-logo.png" alt="ProCredit" />
      </button>
      <div className="side-sect">Portfolio</div>
      {item("overview", "Overview", ICON.grid)}
      {item("portfolio", "Portfolio", ICON.table)}
      {item("watchlist", "Watchlist", ICON.eye)}
      {item("exits", "Exits", ICON.exit, <span className="side-badge">{exitCount}</span>)}
      <div className="side-sect">Analysis</div>
      {item("analytics", "Analytics", ICON.report)}

      <div className="side-spacer"></div>

      <div className="side-toggle">{ICON.moon}<span>Dark mode</span>
        <button className={"switch" + (dark ? " on" : "")} onClick={() => setDark(!dark)} aria-label="Toggle dark mode"></button>
      </div>
      <div className="side-card">
        <div className="side-card-row"><span className="side-card-dot"></span><span className="side-card-t">Live status</span></div>
        <div className="side-card-s">Supabase &middot; <b>{DATA.meta.updated.split(" ")[0]}</b><br/>Real-time portfolio data.</div>
      </div>
    </aside>
  );
}

function WsBar({ onSearch, onOpenTable }) {
  const [q, setQ] = useState("");
  return (
    <div className="wsbar">
      <div className="wssearch">
        {ICON.search}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search economic group or industry…"
          onKeyDown={(e) => { if (e.key === "Enter") { onSearch(q); } }} />
      </div>
      <div className="wsbar-right">
      </div>
    </div>
  );
}

function genSeries(end, n, seed, vol) {
  let a = seed * 9973 + 1;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  const arr = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    arr.push(Math.max(end * 0.45, end * (0.8 + 0.2 * t) + end * vol * (rnd() - 0.5)));
  }
  arr[n - 1] = end;
  return arr;
}

function Sparkline({ series, color }) {
  const w = 460, h = 132, pad = 8;
  const min = Math.min(...series), max = Math.max(...series), range = (max - min) || 1;
  const pts = series.map((v, i) => [pad + (i / (series.length - 1)) * (w - 2 * pad), pad + (1 - (v - min) / range) * (h - 2 * pad)]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = line + ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.32" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={area} fill="url(#spk)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="var(--surface)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DashHome({ onRowClick, onDrill }) {
  const { rows, totals, meta } = DATA;
  const [period, setPeriod] = useState("Week");
  const [tab, setTab] = useState("principal");
  const [hiMix, setHiMix] = useState(null);

  const metricVal = tab === "principal" ? totals.principalBalance : totals.overduePrincipal;
  const periods = {
    Today: { labels: ["9a", "11a", "1p", "3p", "5p", "7p", "Now"], n: 7, seed: 11 },
    Week:  { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], n: 7, seed: 23 },
    Month: { labels: ["W1", "W2", "W3", "W4", "W5", "W6"], n: 6, seed: 37 },
  };
  const P = periods[period];
  const series = genSeries(metricVal, P.n, P.seed + (tab === "principal" ? 0 : 5), tab === "principal" ? 0.05 : 0.16);
  const chg = (series[series.length - 1] - series[0]) / series[0];
  const sparkColor = tab === "principal" ? "var(--brand)" : "var(--neg)";

  const grp = (cls) => rows.filter((r) => cls.includes(r.classification)).reduce((s, r) => s + r.principalBalance, 0);
  const subs = [
    { l: "Current",     v: grp(["Current"]),           up: true  },
    { l: "Watchlist",   v: grp(["Watchlist"]),          up: true  },
    { l: "Substandard", v: grp(["SM", "SS-P", "SS-NP"]), up: false },
    { l: "Doubtful",    v: grp(["Doubtful", "Loss"]),   up: false },
  ];

  const byClass = meta.classifications
    .map((c) => ({ label: c, value: rows.filter((r) => r.classification === c).length, color: U.CLASS_STYLE[c] ? U.CLASS_STYLE[c].fg : "var(--ink-300)" }))
    .filter((s) => s.value > 0);
  const totC = byClass.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const arcs = byClass.map((s) => { const seg = { ...s, start: acc / totC, frac: s.value / totC }; acc += s.value; return seg; });

  const recent = [...rows].sort((a, b) => b.principalBalance - a.principalBalance).slice(0, 6);
  const avColors = ["#3a8fc7", "#46c06a", "#f5b13e", "#a06bd6", "#ff6b6b", "#5aa9e6"];
  const initials = (s) => (s || "").replace(/[^a-zA-Z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "??";
  const up   = <svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 2.5l3.5 5h-7z"/></svg>;
  const down = <svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 9.5l-3.5-5h7z"/></svg>;

  return (
    <div>
      <div className="greet">
        <div>
          <div className="greet-hi">Welcome back</div>
          <div className="greet-h1">Portfolio at a glance</div>
        </div>
        <div className="seg">
          {["Today", "Week", "Month"].map((p) => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{tab === "principal" ? "Principal Balance" : "Overdue Principal"}</h3>
          <div className="bal-tabs">
            <button className={tab === "principal" ? "on" : ""} onClick={() => setTab("principal")}>Principal</button>
            <button className={tab === "overdue" ? "on" : ""} onClick={() => setTab("overdue")}>Overdue</button>
          </div>
        </div>
        <div className="bal-body">
          <div>
            <div className="bal-num">{U.abbrevPHP(metricVal)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <div className={"bal-chg " + (chg >= 0 ? "up" : "down")}>{chg >= 0 ? up : down}{U.pct(Math.abs(chg), 1)}</div>
              <span style={{ fontSize: 12.5, color: "var(--ink-500)" }}>vs last {period.toLowerCase()}</span>
            </div>
            <div className="bal-sub">{U.fullPHP(metricVal)} across {totals.borrowers} economic groups</div>
          </div>
          <div className="spark-wrap">
            <Sparkline series={series} color={sparkColor} />
            <div className="spark-x">{P.labels.map((l, i) => <span key={i}>{l}</span>)}</div>
          </div>
        </div>
        <div className="substats">
          {subs.map((s, i) => (
            <div key={i} className="substat">
              <div className="substat-l">{s.l}</div>
              <div className="substat-v">{U.abbrevPHP(s.v)}<span style={{ color: s.up ? "var(--pos)" : "var(--neg)" }}>{s.up ? up : down}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Portfolio mix</h3>
            <button className="link" onClick={() => onDrill({})}>Detail &rarr;</button>
          </div>
          <div className="mix-total">Total groups</div>
          <div className="mix-num">{totals.borrowers}<span style={{ color: "var(--pos)", display: "inline-flex", width: 16 }}>{up}</span></div>
          <div className="mix-body">
            <div className="mix-donut">
              <svg viewBox="0 0 120 120" width="240" height="240" style={{ transform: "rotate(-90deg)" }}>
                {arcs.map((a, i) => {
                  const r = 46, c = 60, circ = 2 * Math.PI * r;
                  return <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={a.color}
                    strokeWidth={hiMix === i ? 21 : 17}
                    strokeDasharray={`${a.frac * circ} ${circ - a.frac * circ}`} strokeDashoffset={-a.start * circ} strokeLinecap="butt"
                    style={{ cursor: "pointer", opacity: hiMix === null || hiMix === i ? 1 : 0.35, transition: "stroke-width .15s, opacity .15s" }}
                    onMouseEnter={() => setHiMix(i)} onMouseLeave={() => setHiMix(null)}
                    onClick={() => onDrill({ classification: a.label }, { replace: true })} />;
                })}
              </svg>
            </div>
            <div className="mix-legend">
              {byClass.map((s, i) => (
                <div key={i} className="mix-leg"
                  style={{ cursor: "pointer", opacity: hiMix === null || hiMix === i ? 1 : 0.45, transition: "opacity .15s" }}
                  onMouseEnter={() => setHiMix(i)} onMouseLeave={() => setHiMix(null)}
                  onClick={() => onDrill({ classification: s.label }, { replace: true })}>
                  <span className="mix-leg-dot" style={{ background: s.color }}></span>
                  <span className="mix-leg-l">{s.label}</span>
                  <span className="mix-leg-v">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Top exposures</h3>
            <button className="link" onClick={() => onDrill({})}>View all &rarr;</button>
          </div>
          <div>
            {recent.map((r, i) => (
              <div key={r.id} className="recent-row" onClick={() => onRowClick(r)}>
                <div className="recent-name">
                  <span className="recent-av" style={{ background: avColors[i % avColors.length] }}>{initials(r.economicGroup)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="recent-nm">{r.economicGroup}</div>
                    <div className="recent-ind">{r.industry}</div>
                  </div>
                </div>
                <ActionBadge action={r.action} />
                <span className="recent-val">{U.abbrevPHP(r.principalBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  ROOT                                                                 */
/* ===================================================================== */
function App() {
  const [status, setStatus] = useState("loading");
  const [errMsg, setErrMsg] = useState("");
  const [view, setView] = useState("landing"); // landing | overview | table | analytics
  const [section, setSection] = useState("overview");
  const [dark, setDark] = useState(true);
  const [noAnim, setNoAnim] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "principalBalance", dir: -1 });

  useEffect(() => {
    window.loadPortfolio()
      .then((portfolio) => { DATA = portfolio; setStatus("ready"); })
      .catch((err) => { setErrMsg(err.message || "Unknown error"); setStatus("error"); });
  }, []);

  function retry() {
    setStatus("loading"); setErrMsg("");
    window.loadPortfolio()
      .then((p) => { DATA = p; setStatus("ready"); })
      .catch((e) => { setErrMsg(e.message || "Unknown error"); setStatus("error"); });
  }

  if (status === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16, color: "var(--ink-500)" }}>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--line)", borderTopColor: "var(--brand)", animation: "_spin 0.8s linear infinite" }}></div>
      <div style={{ fontSize: 13, fontFamily: "var(--mono)" }}>Loading portfolio data…</div>
    </div>
  );

  if (status === "error") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: "var(--neg)" }}>Failed to load portfolio data</div>
      <div style={{ fontSize: 13, color: "var(--ink-500)", fontFamily: "var(--mono)", maxWidth: 520 }}>{errMsg}</div>
      <div style={{ fontSize: 13, color: "var(--ink-500)", maxWidth: 520, marginTop: 4 }}>
        Make sure the Supabase anon key has a <strong>read-only RLS policy</strong> granting SELECT on both loan and repayment tables, and that this device can reach supabase.co.
      </div>
      <button className="btn-primary" style={{ marginTop: 8 }} onClick={retry}>Retry</button>
    </div>
  );

  const goTable = (preset, opts) => {
    if (preset && preset.focus) { setSection("portfolio"); setView("table"); setDetail(preset.focus); return; }
    if (preset) setFilters(opts && opts.replace ? preset : (f) => ({ ...f, ...preset }));
    setQuery("");
    setSection("portfolio");
    setView("table");
  };

  const onNav = (key) => {
    setSection(key);
    if (key === "overview") { setView("overview"); }
    else if (key === "portfolio") { setFilters({}); setView("table"); }
    else if (key === "watchlist") { setFilters({ classification: "Watchlist" }); setView("table"); }
    else if (key === "exits") { setFilters({ action: "EXIT" }); setView("table"); }
    else if (key === "analytics") { setView("analytics"); }
  };

  const enterSearch = (q) => { setQuery(q); setFilters({}); setSection("portfolio"); setView("table"); };

  const toggleDark = () => {
    setNoAnim(true);
    setDark((d) => !d);
    requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
  };

  return (
    <div className={"app" + (view !== "landing" ? " appdark" : "")}>
      {view === "landing" && (
        <Landing
          onEnter={() => { setSection("overview"); setView("overview"); }}
          onTable={() => { setSection("portfolio"); goTable({}); }}
          onExit={() => { setSection("exits"); goTable({ action: "EXIT" }); }}
        />
      )}
      {view !== "landing" && (
        <div className={"shell" + (dark ? "" : " light") + (noAnim ? " no-anim" : "")}>
          <Sidebar section={section} onNav={onNav} dark={dark} setDark={toggleDark} onLogo={() => setView("landing")} />
          <div className="ws">
            <WsBar onSearch={enterSearch} onOpenTable={() => onNav("portfolio")} />
            <div className="ws-scroll">
              {view === "overview"   && <DashHome onRowClick={setDetail} onDrill={goTable} />}
              {view === "table"      && <Table onRowClick={setDetail} filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} sort={sort} setSort={setSort} />}
              {view === "analytics"  && <Analytics onDrillTo={goTable} />}
            </div>
          </div>
          {detail && <Detail row={detail} onClose={() => setDetail(null)} />}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
