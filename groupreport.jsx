/* Pro Credit — Economic Group performance report
   DPD trend (annual + monthly) and exposure history for a single economic group,
   built from the monthly snapshots in "Test - Historical DB". */
const { useMemo: useMemoGroupReport } = React;

function dpdBucketForReport(dpd) {
  if (dpd <= 0) return "Current";
  if (dpd <= 29) return "0-29";
  if (dpd <= 59) return "30-59";
  if (dpd <= 89) return "60-89";
  return "90+";
}

function GroupReport({ economicGroup }) {
  const { rows, history } = DATA;
  const row = useMemoGroupReport(() => rows.find((r) => r.economicGroup === economicGroup), [rows, economicGroup]);
  const points = (history && history.byGroup[economicGroup]) || [];

  const exposureSeries = useMemoGroupReport(() => points.map((p) => ({ x: p.label, y: p.principalBalance })), [points]);

  const monthlyDpdSeries = useMemoGroupReport(() => points.slice(-12).map((p) => ({ x: p.label, y: p.dpd })), [points]);

  const annualDpd = useMemoGroupReport(() => {
    const byYear = {};
    points.forEach((p) => { const y = p.date.getFullYear(); byYear[y] = Math.max(byYear[y] || 0, p.dpd); });
    return Object.keys(byYear).sort().map((y) => ({ label: y, value: byYear[y], color: U.DPD_STYLE[dpdBucketForReport(byYear[y])] }));
  }, [points]);

  const currentExposure = row ? row.principalBalance : 0;
  const maxExposure = useMemoGroupReport(() => points.reduce((m, p) => Math.max(m, p.principalBalance), currentExposure), [points, currentExposure]);
  const peakDpd = points.length ? Math.max(...points.map((p) => p.dpd)) : null;

  const exposureCompare = [
    { label: "Max exposure", value: maxExposure, color: "var(--warn)" },
    { label: "Current exposure", value: currentExposure, color: "var(--brand)" },
  ];

  if (!row && points.length === 0) {
    return (
      <div className="page">
        <div className="hero"><div><h1 className="hero-title">Economic group not found</h1>
          <p className="hero-sub">No live loans or historical snapshots match &ldquo;{economicGroup}&rdquo;.</p></div></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="hero">
        <div>
          <div className="eyebrow">{row ? row.industry : "No longer in the live book"}{row && row.riskTier ? " · " + row.riskTier : ""}</div>
          <h1 className="hero-title">{economicGroup}</h1>
          {row && (
            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <ClassDot cls={row.classification} />
              <ActionBadge action={row.action} size="lg" />
            </div>
          )}
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Current Exposure" value={U.abbrevPHP(currentExposure)} />
        <Kpi label="Max Historical Exposure" value={U.abbrevPHP(maxExposure)}
          sub={maxExposure > currentExposure ? "above current exposure" : null} />
        <Kpi label="Current DPD" value={row ? row.dpd : "—"} sub={row ? row.dpdBucket : ""} />
        <Kpi label="Peak DPD (historical)" value={peakDpd == null ? "—" : peakDpd} />
      </div>

      <div className="grid-2">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>Exposure History</h3></div>
          <LineChart series={exposureSeries} color="var(--brand)" fmt={U.exactPHP} height={260} />
        </div>

        <div className="card">
          <div className="card-head"><h3>Max Exposure vs Current Exposure</h3></div>
          <Bars items={exposureCompare} fmt={U.exactPHP} />
        </div>

        <div className="card">
          <div className="card-head"><h3>DPD — Annual (peak)</h3></div>
          <Bars items={annualDpd} fmt={(v) => v + "d"} />
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h3>DPD — Monthly (last {monthlyDpdSeries.length})</h3></div>
          <LineChart series={monthlyDpdSeries} color="var(--neg)" fmt={(v) => v + "d"} height={260} />
        </div>
      </div>
      <div className="page-foot">Monthly snapshots from Test - Historical DB &middot; Pro Credit Portfolio Risk</div>
    </div>
  );
}

Object.assign(window, { GroupReport });
