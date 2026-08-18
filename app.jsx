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

function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
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

function Filters({ filters, setFilters, meta, count, total, onReset, onExport, query, setQuery, hiddenCols, onToggleCol, onSetAllCols }) {
  const [open, setOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);
  const activeCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    if (!colPickerOpen) return;
    const h = (e) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [colPickerOpen]);

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
          <div style={{ position: "relative" }} ref={colPickerRef}>
            <button className="btn-ghost" onClick={() => setColPickerOpen((o) => !o)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 4h14M1 8h14M1 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="9.5" y="2.5" width="4" height="3" rx="0.75" fill="var(--surface)" stroke="currentColor" strokeWidth="1.2"/></svg>
              Columns
              {hiddenCols.size > 0 && <span style={{ display: "inline-grid", placeItems: "center", minWidth: 18, height: 18, borderRadius: 999, background: "var(--brand)", color: "#fff", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600, padding: "0 4px" }}>{hiddenCols.size}</span>}
            </button>
            {colPickerOpen && (
              <div className="col-picker">
                <div className="col-picker-actions">
                  <button className="link" onClick={() => onSetAllCols(false)}>Select all</button>
                  <button className="link" onClick={() => onSetAllCols(true)}>Unselect all</button>
                </div>
                {COLUMNS.filter((c) => !c.sticky).map((c) => (
                  <label key={c.key} className="col-picker-row">
                    <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={() => onToggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="filters-rows">
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
  const [hiddenCols, setHiddenCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("pc_hiddenCols") || '["industry"]')); }
    catch { return new Set(["industry"]); }
  });
  const toggleCol = (key) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem("pc_hiddenCols", JSON.stringify([...next]));
      return next;
    });
  };
  const setAllCols = (hide) => {
    const next = hide ? new Set(COLUMNS.filter((c) => !c.sticky).map((c) => c.key)) : new Set();
    localStorage.setItem("pc_hiddenCols", JSON.stringify([...next]));
    setHiddenCols(next);
  };
  const visibleCols = COLUMNS.filter((c) => !hiddenCols.has(c.key));

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
        onReset={() => { setFilters({}); setQuery(""); }} onExport={exportCSV} query={query} setQuery={setQuery}
        hiddenCols={hiddenCols} onToggleCol={toggleCol} onSetAllCols={setAllCols} />

      <div className="table-wrap">
        <table className="ptable">
          <thead>
            <tr>
              {visibleCols.map((c) => (
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
                {visibleCols.map((c) => (
                  <td key={c.key} className={(c.sticky ? "sticky-col " : "") + (c.align === "right" ? "ralign" : "")}>
                    <Cell col={c} row={r} />
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={visibleCols.length} className="empty">No economic groups match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  RAW TABLE — unedited rows straight from a Supabase table             */
/* ===================================================================== */
// Friendly labels for known columns (loan + repayment tables share loan_id/synced_at).
// custom_field_* keys are Loandisk's internal field IDs — meaning confirmed against data.js.
const COLUMN_LABELS = {
  loan_id: "Loan ID",
  loan_application_id: "Loan Application ID",
  borrower_business_name: "Borrower Business Name",
  borrower_id: "Borrower ID",
  custom_field_19606: "Legal Name",
  custom_field_19601: "Industry",
  custom_field_20418: "Risk Tier",
  custom_field_19600: "Revenue Bracket",
  custom_field_20379: "Exposure to Revenue (%)",
  custom_field_20375: "Classification",
  // Unconfirmed meaning — left as the raw db column name rather than guessing.
  custom_field_26248: "custom_field_26248",
  loan_interest_amount: "loan_interest_amount",
  loan_interest: "loan_interest",
  loan_duration: "loan_duration",
  principal_balance_amount: "Principal Balance",
  pending_due_principal: "Pending Due Principal",
  loan_principal_amount: "Original Principal",
  loan_released_date: "Released Date",
  loan_status_id: "Loan Status ID",
  loan_product_id: "Loan Product ID",
  restructured_loan_history: "Restructured Loan History",
  days_past_due: "Days Past Due",
  due_date: "Due Date",
  amortization: "Amortization",
  total_amount_due: "Total Amount Due",
  synced_at: "Last Synced",
  repayment_id: "Repayment ID",
  loan_repayment_method_id: "Repayment Method ID",
  repayment_collected_date: "Collected Date",
  repayment_description: "Description",
  repayment_amount: "Repayment Amount",
  principal_repayment_amount: "Principal Repaid",
  interest_repayment_amount: "Interest Repaid",
  fees_repayment_amount: "Fees Repaid",
  penalty_repayment_amount: "Penalty Repaid",
};

// Fallback for anything not in the map above (e.g. undocumented custom fields /
// loan_fee_id_*): snake_case -> Title Case, keeping numeric IDs and "ID" as-is.
function prettifyColumn(key) {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
  return key.split("_").map((w) => {
    if (/^\d+$/.test(w)) return w;
    if (w.toLowerCase() === "id") return "ID";
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

// Sort raw values numerically when both sides parse as numbers, alphabetically
// otherwise; missing values always sink to the bottom regardless of direction.
function sortValue(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}
function compareRaw(a, b, dir) {
  const va = sortValue(a), vb = sortValue(b);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  if (typeof va === "number" && typeof vb === "number") return dir * (va - vb);
  return dir * String(va).localeCompare(String(vb));
}

// Estimated single-row height (px) used to size the virtualization window below.
// Rows wrap to a variable number of lines, so this is an approximation, not exact.
const ROW_HEIGHT_ESTIMATE = 70;
const OVERSCAN_ROWS = 12;

// Loandisk date columns (repayment_collected_date, due_date, etc.) come through
// Supabase as "MM/DD/YYYY" strings, not ISO — parse into a real Date (local
// midnight) so year/range filtering works instead of doing string comparison.
function parseMDY(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

function RawTable({ rows, rowKey, storageKey, title, blurb, emptyLabel, dateColumn }) {
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);
  const tbodyRef = useRef(null);
  const [range, setRange] = useState({ start: 0, end: 60 });
  const columns = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);

  const [hiddenCols, setHiddenCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
    catch { return new Set(); }
  });
  const toggleCol = (key) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };
  const setAllCols = (hide) => {
    const next = hide ? new Set(columns.slice(1)) : new Set();
    localStorage.setItem(storageKey, JSON.stringify([...next]));
    setHiddenCols(next);
  };
  const visibleCols = columns.filter((c) => !hiddenCols.has(c));

  useEffect(() => {
    if (!colPickerOpen) return;
    const h = (e) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [colPickerOpen]);

  // Parsed once per row per data load, then reused by both the year dropdown and
  // the range filter below instead of re-parsing the same "MM/DD/YYYY" string twice.
  const parsedDates = useMemo(() => {
    if (!dateColumn) return null;
    return rows.map((r) => parseMDY(r[dateColumn]));
  }, [rows, dateColumn]);

  const years = useMemo(() => {
    if (!parsedDates) return [];
    const set = new Set();
    parsedDates.forEach((d) => { if (d) set.add(d.getFullYear()); });
    return [...set].sort((a, b) => b - a);
  }, [parsedDates]);

  const dateFiltered = useMemo(() => {
    if (!parsedDates || (!yearFilter && !dateFrom && !dateTo)) return rows;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return rows.filter((r, i) => {
      const d = parsedDates[i];
      if (!d) return false;
      if (yearFilter && d.getFullYear() !== Number(yearFilter)) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, parsedDates, yearFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dateFiltered;
    return dateFiltered.filter((r) => columns.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  }, [dateFiltered, query, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => compareRaw(a[sort.key], b[sort.key], sort.dir));
    return arr;
  }, [filtered, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  // Only render <tr> elements near the visible viewport — these tables can hold thousands
  // of wrapped-text rows, and mounting/reordering that many real DOM nodes at once (e.g. on
  // first navigation to the page, or on sort) is what causes the multi-hundred-ms lag.
  useEffect(() => {
    const scroller = document.querySelector(".ws-scroll");
    if (!scroller || !tbodyRef.current) return;
    let raf = null;
    const compute = () => {
      raf = null;
      if (!tbodyRef.current) return;
      const wrapTop = tbodyRef.current.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const viewTop = scroller.scrollTop - wrapTop;
      const viewBottom = viewTop + scroller.clientHeight;
      const start = Math.max(0, Math.floor(viewTop / ROW_HEIGHT_ESTIMATE) - OVERSCAN_ROWS);
      const end = Math.min(sorted.length, Math.ceil(viewBottom / ROW_HEIGHT_ESTIMATE) + OVERSCAN_ROWS);
      setRange({ start, end });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    scroller.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    return () => { scroller.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [sorted.length]);

  const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

  const exportCSV = () => {
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [visibleCols.map((c) => esc(prettifyColumn(c))).join(",")];
    sorted.forEach((r) => lines.push(visibleCols.map((c) => esc(r[c])).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title.toLowerCase().replace(/\s+/g, "_") + ".csv";
    a.click();
  };

  return (
    <div className="page table-page">
      <div className="hero">
        <div>
          <h1 className="hero-title">{title}</h1>
          <p className="hero-sub">{blurb}</p>
        </div>
      </div>

      <div className="filters">
        <div className="filters-top">
          <div className="search">
            {ICON.search}
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all columns…" />
            {query && <button className="search-x" onClick={() => setQuery("")}>&times;</button>}
          </div>
          <div className="filters-actions">
            <span className="count">{sorted.length}<span className="count-sub"> / {rows.length}</span></span>
            {dateColumn && (
              <button className="btn-ghost" onClick={() => setFiltersOpen((o) => !o)} style={{ gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Filters
                {(yearFilter || dateFrom || dateTo) && <span style={{ display: "inline-grid", placeItems: "center", minWidth: 18, height: 18, borderRadius: 999, background: "var(--brand)", color: "#fff", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600, padding: "0 4px" }}>{[yearFilter, dateFrom, dateTo].filter(Boolean).length}</span>}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform .2s", transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <button className="btn-ghost" onClick={exportCSV}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Export CSV
            </button>
            <div style={{ position: "relative" }} ref={colPickerRef}>
              <button className="btn-ghost" onClick={() => setColPickerOpen((o) => !o)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 4h14M1 8h14M1 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="9.5" y="2.5" width="4" height="3" rx="0.75" fill="var(--surface)" stroke="currentColor" strokeWidth="1.2"/></svg>
                Columns
                {hiddenCols.size > 0 && <span style={{ display: "inline-grid", placeItems: "center", minWidth: 18, height: 18, borderRadius: 999, background: "var(--brand)", color: "#fff", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 600, padding: "0 4px" }}>{hiddenCols.size}</span>}
              </button>
              {colPickerOpen && (
                <div className="col-picker">
                  <div className="col-picker-actions">
                    <button className="link" onClick={() => setAllCols(false)}>Select all</button>
                    <button className="link" onClick={() => setAllCols(true)}>Unselect all</button>
                  </div>
                  {columns.slice(1).map((c) => (
                    <label key={c} className="col-picker-row">
                      <input type="checkbox" checked={!hiddenCols.has(c)} onChange={() => toggleCol(c)} />
                      {prettifyColumn(c)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {dateColumn && filtersOpen && (
          <div className="filters-rows">
            <div className="frow">
              <span className="frow-label">Year</span>
              <select className="select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="frow-label" style={{ width: "auto" }}>Date range</span>
              <input type="date" className="select" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span style={{ color: "var(--ink-400)", fontSize: 12 }}>to</span>
              <input type="date" className="select" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              {(yearFilter || dateFrom || dateTo) && (
                <button className="link" onClick={() => { setYearFilter(""); setDateFrom(""); setDateTo(""); }}>Clear</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap raw-wrap">
        <table className="ptable raw-table">
          <thead>
            <tr>
              {visibleCols.map((c, i) => (
                <th key={c} className={i === 0 ? "sticky-col" : ""} onClick={() => toggleSort(c)}>
                  <span className="th-inner">
                    {prettifyColumn(c)}
                    <span className={"sort-ind" + (sort.key === c ? " on" : "")}>
                      {sort.key === c ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {range.start > 0 && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length || 1} style={{ height: range.start * ROW_HEIGHT_ESTIMATE, padding: 0, border: "none" }}></td></tr>
            )}
            {sorted.slice(range.start, range.end).map((r, i) => {
              const ri = range.start + i;
              return (
                <tr key={r[rowKey] ?? ri}>
                  {visibleCols.map((c, ci) => (
                    <td key={c} className={ci === 0 ? "sticky-col" : ""}>{fmt(r[c])}</td>
                  ))}
                </tr>
              );
            })}
            {range.end < sorted.length && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length || 1} style={{ height: (sorted.length - range.end) * ROW_HEIGHT_ESTIMATE, padding: 0, border: "none" }}></td></tr>
            )}
            {sorted.length === 0 && (
              <tr><td colSpan={visibleCols.length || 1} className="empty">{emptyLabel}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoanDatabase() {
  return (
    <RawTable
      rows={DATA.rawLoans || []}
      rowKey="loan_id"
      storageKey="pc_hiddenCols_rawLoans"
      title="Loan Database"
      blurb='Loandisk raw loan data'
      emptyLabel="No loans match this search."
    />
  );
}

function RepaymentDatabase() {
  return (
    <RawTable
      rows={DATA.rawRepayments || []}
      rowKey="repayment_id"
      storageKey="pc_hiddenCols_rawRepayments"
      title="Repayment Database"
      blurb='Loandisk raw repayment data'
      emptyLabel="No repayments match this search or date filter."
      dateColumn="repayment_collected_date"
    />
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

function Detail({ row, onClose, onOpenReport }) {
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
            <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => onOpenReport(row.economicGroup)}>
              View performance report &rarr;
            </button>
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
  back: <svg viewBox="0 0 20 20" fill="none"><path d="M12.5 4l-7 6 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  grid: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  table: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 8h14M8 8v8" stroke="currentColor" strokeWidth="1.6"/></svg>,
  eye: <svg viewBox="0 0 20 20" fill="none"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  exit: <svg viewBox="0 0 20 20" fill="none"><path d="M12 3H5a2 2 0 00-2 2v10a2 2 0 002 2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 10h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  report: <svg viewBox="0 0 20 20" fill="none"><path d="M5 3h7l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6"/><path d="M7 10v4M10 8v6M13 11v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  db: <svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="5" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 5v10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  receipt: <svg viewBox="0 0 20 20" fill="none"><path d="M5 2.5h10v15l-2-1.3-1.7 1.3-1.6-1.3-1.7 1.3-1.7-1.3-1.3 1.3v-15z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M7.3 7h5.4M7.3 10h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  cash: <svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  moon: <svg viewBox="0 0 20 20" fill="none"><path d="M16 11a6 6 0 11-7-7 5 5 0 007 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  lock: <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 8a4 4 0 018 0c0 4 1.5 5 1.5 5h-11S6 12 6 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8.5 16a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/></svg>,
  sidebar: <svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 3.5v13" stroke="currentColor" strokeWidth="1.6"/></svg>,
  menu: <svg viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
};

function Sidebar({ section, onNav, dark, setDark, onLogo, onBack, canBack, collapsed, onToggleCollapse, mobileOpen, onLogout }) {
  const exitCount = DATA.rows.filter((r) => r.action === "EXIT").length;
  const item = (key, label, icon, extra) => (
    <button className={"side-link" + (section === key ? " on" : "")} onClick={() => onNav(key)} title={label}>
      {icon}<span>{label}</span>{extra}
    </button>
  );
  return (
    <aside className={"side" + (collapsed && !mobileOpen ? " collapsed" : "") + (mobileOpen ? " mobile-open" : "")}>
      <div className="side-logo-row">
        <button className="side-logo" onClick={onLogo} title="Back to landing">
          <img src="procredit-logo.png" alt="ProCredit" />
        </button>
        <div className="side-logo-actions">
          {canBack && (
            <button className="side-back" onClick={onBack} title="Go back">
              {ICON.back}
            </button>
          )}
          <button className="side-back side-collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {ICON.sidebar}
          </button>
        </div>
      </div>
      <div className="side-sect">Portfolio</div>
      {item("overview", "Overview", ICON.grid)}
      {item("portfolio", "Portfolio", ICON.table)}
      {item("watchlist", "Watchlist", ICON.eye)}
      {item("exits", "Exits", ICON.exit, <span className="side-badge">{exitCount}</span>)}
      <div className="side-sect">Analysis</div>
      {item("analytics", "Analytics", ICON.report)}
      {item("loandb", "Loan Database", ICON.db)}
      {item("repaymentdb", "Repayment Database", ICON.receipt)}

      <div className="side-spacer"></div>

      <div className="side-toggle">{ICON.moon}<span>Dark mode</span>
        <button className={"switch" + (dark ? " on" : "")} onClick={() => setDark(!dark)} aria-label="Toggle dark mode"></button>
      </div>
      <div className="side-card">
        <div className="side-card-row"><span className="side-card-dot"></span><span className="side-card-t">Live status</span></div>
        <div className="side-card-s"><b>{DATA.meta.updated.split(" ")[0]}</b><br/>Real-time portfolio data.</div>
      </div>
      <button className="side-link" onClick={onLogout} title="Log out">
        <svg viewBox="0 0 20 20" fill="none"><path d="M8 3H5a2 2 0 00-2 2v10a2 2 0 002 2h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M13 6l4 4-4 4M17 10H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span>Log out</span>
      </button>
    </aside>
  );
}

function displayNameFromEmail(email) {
  const local = (email || "").split("@")[0];
  const words = local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : (email || "");
}

function initialsFromEmail(email) {
  const words = displayNameFromEmail(email).split(" ").filter(Boolean);
  const initials = (words[0]?.[0] || "") + (words[1]?.[0] || "");
  return initials.toUpperCase() || "?";
}

function WsBar({ onSearch, onOpenTable, onOpenMobileNav, userEmail }) {
  const [q, setQ] = useState("");
  return (
    <div className="wsbar">
      <button className="mobile-menu-btn" onClick={onOpenMobileNav} title="Open menu" aria-label="Open menu">
        {ICON.menu}
      </button>
      <div className="wssearch">
        {ICON.search}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search economic group or industry…"
          onKeyDown={(e) => { if (e.key === "Enter") { onSearch(q); } }} />
      </div>
      <div className="wsbar-right">
        {userEmail && (
          <div className="ws-avatar" title={userEmail}>
            <div className="av">{initialsFromEmail(userEmail)}</div>
            <div>
              <div className="nm">{displayNameFromEmail(userEmail)}</div>
              <div className="rl">{userEmail}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashHome({ onRowClick, onDrill }) {
  const { rows, totals, meta, history } = DATA;
  const [period, setPeriod] = useState("Monthly"); // Monthly | Annually | Current
  const [tab, setTab] = useState("principal");
  const [hiMix, setHiMix] = useState(null);

  const metricVal = tab === "principal" ? totals.principalBalance : totals.overduePrincipal;
  const metricOf = (p) => (tab === "principal" ? p.principalBalance : p.overduePrincipal);

  // Real totals from Test - Historical DB, with the live current total appended as
  // "Now" so the line reflects right-now rather than stopping at the last snapshot.
  const fullSeries = (history && history.totalSeries) || [];
  const monthlySeries = fullSeries.map((p) => ({ x: p.label, y: metricOf(p) }));
  if (monthlySeries.length) monthlySeries.push({ x: "Now", y: metricVal });

  // One point per calendar year (that year's latest snapshot) — fullSeries is already
  // chronological, so the last write per year wins and lands on the latest month seen.
  const annualByYear = {};
  fullSeries.forEach((p) => { annualByYear[p.date.getFullYear()] = p; });
  const annualSeries = Object.keys(annualByYear).sort().map((y) => ({ x: y, y: metricOf(annualByYear[y]) }));
  if (annualSeries.length) annualSeries.push({ x: "Now", y: metricVal });

  const series = period === "Annually" ? annualSeries : monthlySeries;
  const chg = series.length > 1 && series[0].y ? (series[series.length - 1].y - series[0].y) / series[0].y : 0;
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
        <div className="seg">
          {["Monthly", "Annually", "Current"].map((p) => (
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
            {period !== "Current" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <div className={"bal-chg " + (chg >= 0 ? "up" : "down")}>{chg >= 0 ? up : down}{U.pct(Math.abs(chg), 1)}</div>
                <span style={{ fontSize: 12.5, color: "var(--ink-500)" }}>{period === "Annually" ? "trailing annual" : "trailing monthly"}</span>
              </div>
            )}
            <div className="bal-sub">{U.fullPHP(metricVal)} across {totals.borrowers} economic groups</div>
          </div>
          <div className="spark-wrap">
            {period === "Current" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--pos)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--pos)" }}></span>Live
                </span>
                <span style={{ fontSize: 12.5, color: "var(--ink-500)" }}>As of {meta.updated}</span>
              </div>
            ) : (
              <LineChart series={series} color={sparkColor} height={220} fmt={U.exactPHP} />
            )}
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
  const [session, setSession] = useState(() => getSession());
  const [pendingEntry, setPendingEntry] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errMsg, setErrMsg] = useState("");
  const [view, setView] = useState("landing"); // landing | overview | table | analytics | loandb | repaymentdb | groupReport
  const [section, setSection] = useState("overview");
  const [dark, setDark] = useState(true);
  const [noAnim, setNoAnim] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "principalBalance", dir: -1 });
  const [navHistory, setNavHistory] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("pc_sidebarCollapsed") === "1");
  const toggleSidebar = () => setSidebarCollapsed((c) => { localStorage.setItem("pc_sidebarCollapsed", c ? "0" : "1"); return !c; });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [reportGroup, setReportGroup] = useState(null);

  // The landing page shows real portfolio summary numbers, so it loads data
  // regardless of auth — the login gate only blocks entering the dashboard
  // proper, it isn't a data-access boundary (the anon key + RLS already are).
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

  // Wrap a landing-page CTA so it requires login first: if already signed in,
  // run it immediately; otherwise stash it and run it right after Login succeeds.
  function requireAuth(action) {
    if (session) action();
    else setPendingEntry(() => action);
  }

  function logout() {
    clearSession();
    setSession(null);
    setView("landing");
  }

  if (pendingEntry) return <Login onSuccess={() => {
    setSession(getSession());
    const run = pendingEntry;
    setPendingEntry(null);
    run();
  }} />;

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

  const pushHistory = (curView, curSection, curFilters, curQuery) => {
    setNavHistory((h) => [...h, { view: curView, section: curSection, filters: curFilters, query: curQuery }]);
  };

  const goBack = () => {
    setNavHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setView(prev.view);
      setSection(prev.section);
      setFilters(prev.filters);
      setQuery(prev.query);
      return h.slice(0, -1);
    });
  };

  const goTable = (preset, opts) => {
    pushHistory(view, section, filters, query);
    if (preset && preset.focus) { setSection("portfolio"); setView("table"); setDetail(preset.focus); return; }
    if (preset) setFilters(opts && opts.replace ? preset : (f) => ({ ...f, ...preset }));
    setQuery("");
    setSection("portfolio");
    setView("table");
  };

  const onNav = (key) => {
    pushHistory(view, section, filters, query);
    setSection(key);
    setMobileNavOpen(false);
    if (key === "overview") { setView("overview"); }
    else if (key === "portfolio") { setFilters({}); setView("table"); }
    else if (key === "watchlist") { setFilters({ classification: "Watchlist" }); setView("table"); }
    else if (key === "exits") { setFilters({ action: "EXIT" }); setView("table"); }
    else if (key === "analytics") { setView("analytics"); }
    else if (key === "loandb") { setView("loandb"); }
    else if (key === "repaymentdb") { setView("repaymentdb"); }
  };

  const enterSearch = (q) => { pushHistory(view, section, filters, query); setQuery(q); setFilters({}); setSection("portfolio"); setView("table"); };

  const openGroupReport = (economicGroup) => {
    pushHistory(view, section, filters, query);
    setDetail(null);
    setReportGroup(economicGroup);
    setView("groupReport");
  };

  const toggleDark = () => {
    setNoAnim(true);
    setDark((d) => !d);
    requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
  };

  return (
    <div className={"app" + (view !== "landing" ? " appdark" : "")}>
      {view === "landing" && (
        <Landing
          onEnter={() => requireAuth(() => { setSection("overview"); setView("overview"); })}
          onTable={() => requireAuth(() => { setSection("portfolio"); goTable({}); })}
          onExit={() => requireAuth(() => { setSection("exits"); goTable({ action: "EXIT" }); })}
        />
      )}
      {view !== "landing" && (
        <div className={"shell" + (dark ? "" : " light") + (noAnim ? " no-anim" : "")}>
          <Sidebar section={section} onNav={onNav} dark={dark} setDark={toggleDark} onLogo={() => { setNavHistory([]); setMobileNavOpen(false); setView("landing"); }} onBack={() => { setMobileNavOpen(false); goBack(); }} canBack={navHistory.length > 0} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} mobileOpen={mobileNavOpen} onLogout={logout} />
          {mobileNavOpen && <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)}></div>}
          <div className="ws">
            <WsBar onSearch={enterSearch} onOpenTable={() => onNav("portfolio")} onOpenMobileNav={() => setMobileNavOpen(true)} userEmail={session.email} />
            <div className="ws-scroll">
              {view === "overview"   && <DashHome onRowClick={setDetail} onDrill={goTable} />}
              {view === "table"      && <Table onRowClick={setDetail} filters={filters} setFilters={setFilters} query={query} setQuery={setQuery} sort={sort} setSort={setSort} />}
              {view === "analytics"  && <Analytics onDrillTo={goTable} />}
              {view === "loandb"     && <LoanDatabase />}
              {view === "repaymentdb" && <RepaymentDatabase />}
              {view === "groupReport" && <GroupReport economicGroup={reportGroup} />}
            </div>
          </div>
          {detail && <Detail row={detail} onClose={() => setDetail(null)} onOpenReport={openGroupReport} />}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
