/* Chart components — hand-built SVG, no external chart lib.
   Exported to window for use by app.jsx */
const { useState: useStateChart, useRef: useRefChart } = React;

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, maxHeight: legendMaxHeight, overflowY: "auto", paddingRight: 4 }}>
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

Object.assign(window, { Donut, HBars, StackBar, GroupedStackBars });
