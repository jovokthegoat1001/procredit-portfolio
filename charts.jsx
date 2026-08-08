/* Chart components — hand-built SVG, no external chart lib.
   Exported to window for use by app.jsx */
const { useState: useStateChart, useRef: useRefChart, useEffect: useEffectChart } = React;

/* Donut chart — segments: [{label, value, color, display, clickable}] */
function Donut({ segments, size = 168, thickness = 26, centerLabel, centerSub, onHover, onSegmentClick, legendMaxHeight = 230 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const [hi, setHi] = useStateChart(null);
  const legendRefs = useRefChart([]);

  const clickable = (seg) => onSegmentClick && seg.clickable !== false;
  const click = (seg) => clickable(seg) && onSegmentClick(seg);
  const focusLegend = (i) => {
    const el = legendRefs.current[i];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="donut-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const len = frac * circ;
          const dash = `${len} ${circ - len}`;
          const el = (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={hi === i ? thickness + 4 : thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-width .15s", cursor: clickable(seg) ? "pointer" : "default" }}
              onMouseEnter={() => { setHi(i); onHover && onHover(seg); focusLegend(i); }}
              onMouseLeave={() => { setHi(null); onHover && onHover(null); }}
              onClick={() => click(seg)}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-legend" style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, maxHeight: legendMaxHeight, overflowY: "auto", paddingRight: 4 }}>
        {segments.map((seg, i) => (
          <div key={i}
            ref={(el) => { legendRefs.current[i] = el; }}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            onClick={() => click(seg)}
            style={{ display: "flex", alignItems: "center", gap: 9, cursor: clickable(seg) ? "pointer" : "default", opacity: hi === null || hi === i ? 1 : 0.45, transition: "opacity .15s", scrollMarginBlock: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, flexShrink: 0 }}></span>
            <span style={{ fontSize: 12.5, color: "var(--ink-700)", flex: 1, whiteSpace: "nowrap" }}>{seg.label}</span>
            <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--ink-500)", minWidth: 64, textAlign: "right" }}>{seg.display != null ? seg.display : U.commas(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Horizontal bars — items: [{label, value, color, display}] */
function HBars({ items, fmt }) {
  const max = Math.max(...items.map((x) => x.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "92px 1fr auto", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-700)", textAlign: "right", whiteSpace: "nowrap" }}>{it.label}</span>
          <div style={{ height: 22, background: "var(--track)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", background: it.color, borderRadius: 4, transition: "width .5s cubic-bezier(.2,.7,.2,1)" }}></div>
          </div>
          <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--ink-600)", minWidth: 64, textAlign: "right" }}>
            {it.display != null ? it.display : (fmt ? fmt(it.value) : it.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Stacked single bar — segments [{label,value,color}] */
function StackBar({ segments, height = 30 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
        {segments.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: "width .5s" }}></div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 12 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }}></span>
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-400)" }}>{U.pct(s.value / total, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Grouped vertical bars, each bar internally stacked by series —
   groups: [{ label, segments: [{ label, color, value }] }] */
function GroupedStackBars({ groups, height = 200, fmt, onSegmentClick, onGroupClick, onSeriesClick }) {
  const [hi, setHi] = useStateChart(null); // { group, series? } | { series } | null
  const totals = groups.map((g) => g.segments.reduce((s, x) => s + x.value, 0));
  const max = Math.max(...totals, 1);
  const legend = [];
  groups.forEach((g) => g.segments.forEach((s) => {
    if (s.value > 0 && !legend.find((l) => l.label === s.label)) legend.push({ label: s.label, color: s.color });
  }));

  const segActive = (g, s) => {
    if (!hi) return true;
    if (hi.group != null && hi.series != null) return g === hi.group && s === hi.series;
    if (hi.group != null) return g === hi.group;
    if (hi.series != null) return s === hi.series;
    return true;
  };
  const isLifted = (g, s) => !!(hi && hi.group === g && hi.series === s);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, borderBottom: "1px solid var(--line)", paddingTop: 8 }}>
        {groups.map((g, i) => {
          const total = totals[i];
          const barH = max ? (total / max) * 100 : 0;
          const colLifting = !!(hi && hi.group === g.label && hi.series != null);
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div title={`${g.label}: ${fmt ? fmt(total) : total}`}
                onMouseEnter={() => setHi({ group: g.label })} onMouseLeave={() => setHi(null)}
                style={{ width: "100%", maxWidth: 46, height: `${barH}%`, minHeight: total > 0 ? 2 : 0, display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: colLifting ? "visible" : "hidden" }}>
                {g.segments.filter((s) => s.value > 0).map((s, j) => {
                  const active = segActive(g.label, s.label);
                  const lifted = isLifted(g.label, s.label);
                  return (
                    <div key={j} title={`${g.label} · ${s.label}`}
                      onMouseEnter={() => setHi({ group: g.label, series: s.label })}
                      onMouseLeave={() => setHi(null)}
                      onClick={() => onSegmentClick && onSegmentClick({ group: g.label, series: s.label })}
                      style={{
                        width: "100%", height: `${(s.value / total) * 100}%`, background: s.color,
                        opacity: active ? 1 : 0.35,
                        transform: lifted ? "scaleX(1.16)" : "scaleX(1)",
                        boxShadow: lifted ? "0 2px 8px rgba(16,24,40,.4)" : "none",
                        position: "relative", zIndex: lifted ? 2 : 1,
                        cursor: onSegmentClick ? "pointer" : "default",
                        transition: "opacity .15s, transform .15s, box-shadow .15s",
                      }}></div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {groups.map((g, i) => {
          const labelHi = !!(hi && hi.group === g.label && hi.series == null);
          return (
            <div key={i} onClick={() => onGroupClick && onGroupClick(g.label)}
              onMouseEnter={() => setHi({ group: g.label })} onMouseLeave={() => setHi(null)}
              style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 11, color: labelHi ? "var(--ink-900)" : "var(--ink-500)", fontWeight: labelHi ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: onGroupClick ? "pointer" : "default", transition: "color .15s" }}>{g.label}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 16px", marginTop: 14 }}>
        {legend.map((l, i) => (
          <div key={i} onClick={() => onSeriesClick && onSeriesClick(l.label)}
            onMouseEnter={() => setHi({ series: l.label })} onMouseLeave={() => setHi(null)}
            style={{ display: "flex", alignItems: "center", gap: 7, cursor: onSeriesClick ? "pointer" : "default", opacity: hi && hi.series && hi.series !== l.label ? 0.45 : 1, transition: "opacity .15s" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color, flexShrink: 0 }}></span>
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Line chart with area fill — series: [{x: label, y: value}]. Points are spaced
   evenly by index (not by real elapsed time), same simplification Sparkline used —
   fine here because callers already collapse history to one evenly-spaced point
   per period before handing it a series.

   Zoom: +/- buttons stretch the plotted width (SVG viewBox stays logical, only the
   rendered CSS width changes), so the wrapping div overflows and becomes horizontally
   scrollable past 1x — no data slicing involved, so nothing to keep in sync when the
   caller swaps in a differently-shaped series (e.g. a period toggle). */
function LineChart({ series, height = 220, color = "var(--brand)", fmt, empty = "Not enough historical data yet." }) {
  // pad (top) is generous on purpose — the y-axis floor is always <= 0 (see min below),
  // so a series that trends upward sits close to the top of the plot area by default;
  // without headroom here the peak point/dot/tooltip reads as cramped against the edge.
  const w = 640, pad = 42, padB = 22, padL = 36, padR = 36;
  const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 0.5;
  const [hoverI, setHoverI] = useStateChart(null);
  const [zoomLevel, setZoomLevel] = useStateChart(1);
  const wrapRef = useRefChart(null);
  const scrollRef = useRefChart(null);
  const centerFracRef = useRefChart(0.5);
  const scrollAnimRef = useRefChart(null);
  const [scrollLeft, setScrollLeft] = useStateChart(0);
  const [containerWidth, setContainerWidth] = useStateChart(0);

  // Track live scroll position + width so x-axis labels near a scrolled-to edge
  // can be hidden instead of rendered — otherwise a label that straddles the
  // visible boundary gets sliced in half by the container's overflow clip
  // (e.g. "Jun '25" rendering as "un '25"), which only shows up once zoomed in
  // past 1x since that's the only time the container actually scrolls.
  useEffectChart(() => {
    const el = scrollRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const onScroll = () => setScrollLeft(el.scrollLeft);
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, []);

  // Manually animate scrollLeft toward a target computed purely from zoomLevel *
  // clientWidth (never from live scrollWidth, which reflects whatever the width
  // transition has interpolated to AT THE INSTANT it's read — a moving goalpost).
  // Native smooth scrollTo doesn't work here either: it clamps its target to the
  // overflow available AT CALL TIME, which is still ~0 the instant a zoom starts,
  // so on rapid clicks it silently clamps to 0 and never retries. Driving our own
  // rAF loop means each new click just cancels and retargets cleanly, same as the
  // CSS width transition already does.
  useEffectChart(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);

    const totalWidth = zoomLevel * scrollEl.clientWidth;
    const maxScroll = Math.max(0, totalWidth - scrollEl.clientWidth);
    const target = Math.min(maxScroll, Math.max(0, centerFracRef.current * totalWidth - scrollEl.clientWidth / 2));
    const startLeft = scrollEl.scrollLeft;
    const delta = target - startLeft;
    if (Math.abs(delta) < 0.5) return;

    const duration = 320;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      scrollEl.scrollLeft = startLeft + delta * eased;
      scrollAnimRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    scrollAnimRef.current = requestAnimationFrame(step);
    return () => { if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current); };
  }, [zoomLevel]);

  if (!series || series.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}>{empty}</div>;
  }
  const f = fmt || ((v) => U.commas(v));
  const n = series.length;
  const vals = series.map((p) => p.y);
  // Scaled to the series' own range, not forced down to a zero floor — for values
  // that never come near zero (e.g. hundreds of millions in principal balance),
  // a forced-zero baseline pins the whole line into a thin band at the top and
  // leaves most of the chart's height empty.
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = (max - min) || 1;
  const plotH = height - pad - padB;
  // Padded on both sides so the first and last points (and their hover
  // tooltips/labels) aren't drawn flush against the true edge, where they'd
  // read as cramped/half-cut-off.
  const plotW = w - padL - padR;
  const x = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => pad + (1 - (v - min) / range) * plotH;
  const pts = series.map((p, i) => [x(i), y(p.y)]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)},${pad + plotH} L${pts[0][0].toFixed(1)},${pad + plotH} Z`;

  const maxLabels = Math.round(7 * zoomLevel);
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const gradId = "lc-" + Math.round(Math.random() * 1e9);
  const canZoom = n >= 3;
  const widthPct = `${zoomLevel * 100}%`;

  const zoomBtnStyle = (disabled) => ({
    width: 22, height: 22, borderRadius: 6, border: "1px solid var(--line)",
    background: "var(--surface)", color: disabled ? "var(--ink-400)" : "var(--ink-600)",
    fontSize: 14, lineHeight: "20px", cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    fontFamily: "var(--mono)",
  });

  const zoomBy = (delta) => {
    const el = scrollRef.current;
    if (el && el.clientWidth > 0) {
      const totalWidth = zoomLevel * el.clientWidth; // current (settled) content width, same basis as the effect above
      centerFracRef.current = (el.scrollLeft + el.clientWidth / 2) / totalWidth;
    }
    setZoomLevel((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));
  };

  const handleMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    // Points only occupy the [padL/w, (w - padR)/w] slice of the container (the rest
    // is the left/right padding gutters) — undo that offset+compression before mapping
    // to an index, otherwise the hovered index drifts from the actual point under the
    // cursor, increasingly so toward either edge.
    const mouseX = relX * w;
    const pointFrac = Math.min(1, Math.max(0, (mouseX - padL) / plotW));
    setHoverI(n === 1 ? 0 : Math.round(pointFrac * (n - 1)));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, minHeight: 22, marginBottom: 4 }}>
        <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} disabled={!canZoom || zoomLevel <= MIN_ZOOM} title="Zoom out" style={zoomBtnStyle(!canZoom || zoomLevel <= MIN_ZOOM)}>&minus;</button>
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={!canZoom || zoomLevel >= MAX_ZOOM} title="Zoom in" style={zoomBtnStyle(!canZoom || zoomLevel >= MAX_ZOOM)}>+</button>
      </div>
      <div ref={scrollRef} style={{ overflowX: zoomLevel > 1 ? "auto" : "visible", overflowY: zoomLevel > 1 ? "hidden" : "visible" }}>
        <div ref={wrapRef} style={{ position: "relative", width: widthPct, minWidth: "100%", transition: "width .32s cubic-bezier(.2,.7,.2,1)" }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
          <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((t, i) => (
              <line key={i} x1="0" x2={w} y1={pad + t * plotH} y2={pad + t * plotH} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill={`url(#${gradId})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {hoverI != null && (
              <line x1={pts[hoverI][0]} x2={pts[hoverI][0]} y1={pad} y2={pad + plotH} stroke={color} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            )}
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={hoverI === i ? 5.5 : (i === n - 1 ? 4 : 3)} fill={color} stroke="var(--surface)" strokeWidth={hoverI === i ? 2 : 1.5} vectorEffect="non-scaling-stroke" style={{ transition: "r .1s" }} />
            ))}
          </svg>
          {hoverI != null && (
            <div style={{
              position: "absolute", left: `${(pts[hoverI][0] / w) * 100}%`, top: `${(pts[hoverI][1] / height) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))", background: "var(--ink-900)", color: "var(--surface)",
              fontFamily: "var(--mono)", padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap",
              boxShadow: "var(--shadow-soft)", pointerEvents: "none", zIndex: 5, textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f(series[hoverI].y)}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{series[hoverI].x}</div>
            </div>
          )}
        </div>
        <div style={{ position: "relative", height: 14, marginTop: 6, width: widthPct, minWidth: "100%", transition: "width .32s cubic-bezier(.2,.7,.2,1)" }}>
          {(() => {
            const totalWidthPx = zoomLevel * containerWidth;
            const maxScroll = Math.max(0, totalWidthPx - containerWidth);
            const hideNearLeft = scrollLeft > 1;
            const hideNearRight = scrollLeft < maxScroll - 1;
            const EDGE_MARGIN = 28;
            return series.map((p, i) => {
              if (!(i % step === 0 || i === n - 1)) return null;
              if (containerWidth > 0) {
                const posInViewport = (pts[i][0] / w) * totalWidthPx - scrollLeft;
                if (hideNearLeft && posInViewport < EDGE_MARGIN) return null;
                if (hideNearRight && posInViewport > containerWidth - EDGE_MARGIN) return null;
              }
              const isFirst = i === 0, isLast = i === n - 1;
              return (
                <span key={i} style={{
                  position: "absolute", left: `${(pts[i][0] / w) * 100}%`,
                  transform: isFirst ? "translateX(0)" : isLast ? "translateX(-100%)" : "translateX(-50%)",
                  fontSize: 10.5, color: "var(--ink-400)", fontFamily: "var(--mono)", whiteSpace: "nowrap",
                }}>{p.x}</span>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

/* Simple (non-stacked) vertical bars, one per category — items: [{label, value, color}] */
function Bars({ items, height = 200, fmt, onClick, empty = "No data yet." }) {
  const [hi, setHi] = useStateChart(null);
  if (!items || items.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}>{empty}</div>;
  }
  const f = fmt || ((v) => U.commas(v));
  const max = Math.max(...items.map((x) => x.value), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, borderBottom: "1px solid var(--line)", paddingTop: 8 }}>
        {items.map((it, i) => {
          const barH = max ? (it.value / max) * 100 : 0;
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
                onClick={() => onClick && onClick(it)}
                style={{
                  // Always render a visible floor sliver, even at value 0 — a bare 0%-height
                  // bar disappears entirely, which reads as "no data for this period" when it
                  // actually means "zero DPD that period" (e.g. Current, no delinquency).
                  position: "relative", width: "100%", maxWidth: 46, height: `${barH}%`, minHeight: 4,
                  background: it.color || "var(--brand)", borderRadius: "3px 3px 0 0",
                  opacity: hi === null || hi === i ? 1 : 0.55,
                  cursor: onClick ? "pointer" : "default", transition: "height .4s cubic-bezier(.2,.7,.2,1), opacity .15s",
                }}>
                {hi === i && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)",
                    background: "var(--ink-900)", color: "var(--surface)", fontFamily: "var(--mono)",
                    padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", boxShadow: "var(--shadow-soft)",
                    pointerEvents: "none", zIndex: 5, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f(it.value)}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{it.label}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 10.5, color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--mono)" }}>{it.label}</div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Donut, HBars, StackBar, GroupedStackBars, LineChart, Bars });
