/* Pro Credit — Portfolio Analytics page
   Industry / risk tier / revenue bracket / classification / DPD breakdowns.
   Every chart drills into the Portfolio table filtered to the clicked slice. */
const { useMemo: useMemoAnalytics } = React;

function topNDonut(rows, field, valueFn, n = 9, fmt) {
  const totals = {};
  rows.forEach((r) => {
    const k = r[field] || "Other";
    totals[k] = (totals[k] || 0) + valueFn(r);
  });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, n);
  const rest = entries.slice(n);
  const restSum = rest.reduce((s, [, v]) => s + v, 0);
  const segments = top.map(([label, value], i) => ({ label, value, display: fmt ? fmt(value) : undefined, color: U.INDUSTRY_PALETTE[i % U.INDUSTRY_PALETTE.length] }));
  if (rest.length) segments.push({ label: "Others", value: restSum, display: fmt ? fmt(restSum) : undefined, color: "var(--ink-300)", clickable: false });
  return segments.filter((s) => s.value > 0);
}

function buildGroups(rows, groupKeys, groupField, seriesKeys, seriesField, valueFn, colorMap) {
  return groupKeys.map((g) => ({
    label: g,
    segments: seriesKeys.map((s) => ({
      label: s,
      color: colorMap[s] || "var(--ink-300)",
      value: rows.filter((r) => r[groupField] === g && r[seriesField] === s).reduce((sum, r) => sum + valueFn(r), 0),
    })),
  }));
}

function Analytics({ onDrillTo }) {
  const { rows, meta } = DATA;

  const drill = (preset) => onDrillTo && onDrillTo(preset, { replace: true });

  const classColors = useMemoAnalytics(() => {
    const m = {};
    meta.classifications.forEach((c) => { m[c] = (U.CLASS_STYLE[c] || {}).fg || "var(--ink-300)"; });
    return m;
  }, []);

  const pbByIndustry  = useMemoAnalytics(() => topNDonut(rows, "industryGroup", (r) => r.principalBalance, Infinity, U.abbrevPHP), []);
  const cntByIndustry = useMemoAnalytics(() => topNDonut(rows, "industryGroup", () => 1, Infinity), []);

  const pbByTier  = useMemoAnalytics(() => buildGroups(rows, meta.riskTiers, "riskTier", meta.classifications, "classification", (r) => r.principalBalance, classColors), []);
  const cntByTier = useMemoAnalytics(() => buildGroups(rows, meta.riskTiers, "riskTier", meta.classifications, "classification", () => 1, classColors), []);

  const pbByBracket  = useMemoAnalytics(() => buildGroups(rows, meta.revenueBrackets, "revenueBracket", meta.classifications, "classification", (r) => r.principalBalance, classColors), []);
  const cntByBracket = useMemoAnalytics(() => buildGroups(rows, meta.revenueBrackets, "revenueBracket", meta.classifications, "classification", () => 1, classColors), []);

  const classBreakdown = useMemoAnalytics(() => meta.classifications.map((c) => ({
    label: c, value: rows.filter((r) => r.classification === c).length, color: classColors[c],
  })).filter((s) => s.value > 0), []);

  const dpdBreakdown = useMemoAnalytics(() => meta.dpdBuckets.map((d) => ({
    label: d, value: rows.filter((r) => r.dpdBucket === d).length, color: U.DPD_STYLE[d],
  })).filter((s) => s.value > 0), []);

  const industryClick = (seg) => seg.clickable !== false && drill({ industryGroup: seg.label });
  const classClick = (seg) => drill({ classification: seg.label });
  const dpdClick = (seg) => drill({ dpdBucket: seg.label });
  const tierSegClick = ({ group, series }) => drill({ riskTier: group, classification: series });
  const tierGroupClick = (g) => drill({ riskTier: g });
  const bracketSegClick = ({ group, series }) => drill({ revenueBracket: group, classification: series });
  const bracketGroupClick = (g) => drill({ revenueBracket: g });

  return (
    <div className="page">
      <div className="hero">
        <div>
          <div className="eyebrow">Updated {meta.updated}</div>
          <h1 className="hero-title">Portfolio Analytics</h1>
          <p className="hero-sub">Principal balance and borrower mix by industry, risk tier, revenue bracket and classification. Click any chart to view the matching economic groups.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Principal Balance by Industry</h3></div>
          <Donut segments={pbByIndustry} size={150} thickness={22} onSegmentClick={industryClick} />
        </div>
        <div className="card">
          <div className="card-head"><h3>Borrower by Industry</h3></div>
          <Donut segments={cntByIndustry} size={150} thickness={22} onSegmentClick={industryClick} />
        </div>

        <div className="card">
          <div className="card-head"><h3>Principal Balance by Risk Tier and Classification</h3></div>
          <GroupedStackBars groups={pbByTier} fmt={U.abbrevPHP} onSegmentClick={tierSegClick} onGroupClick={tierGroupClick} onSeriesClick={(s) => drill({ classification: s })} />
        </div>
        <div className="card">
          <div className="card-head"><h3>Borrower by Risk Tier</h3></div>
          <GroupedStackBars groups={cntByTier} onSegmentClick={tierSegClick} onGroupClick={tierGroupClick} onSeriesClick={(s) => drill({ classification: s })} />
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>Principal Balance by Revenue Bracket and Classification</h3></div>
          <GroupedStackBars groups={pbByBracket} fmt={U.abbrevPHP} height={230} onSegmentClick={bracketSegClick} onGroupClick={bracketGroupClick} onSeriesClick={(s) => drill({ classification: s })} />
        </div>
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>Borrower by Revenue Bracket and Classification</h3></div>
          <GroupedStackBars groups={cntByBracket} height={230} onSegmentClick={bracketSegClick} onGroupClick={bracketGroupClick} onSeriesClick={(s) => drill({ classification: s })} />
        </div>

        <div className="card">
          <div className="card-head"><h3>Classification Breakdown</h3></div>
          <Donut segments={classBreakdown} size={150} thickness={22} onSegmentClick={classClick} />
        </div>
        <div className="card">
          <div className="card-head"><h3>DPD Breakdown</h3></div>
          <Donut segments={dpdBreakdown} size={150} thickness={22} onSegmentClick={dpdClick} />
        </div>
      </div>
      <div className="page-foot">Live from Supabase &middot; Pro Credit Portfolio Risk &middot; figures in PHP</div>
    </div>
  );
}

Object.assign(window, { Analytics });
