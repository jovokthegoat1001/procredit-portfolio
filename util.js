/* Formatting + shared visual helpers (plain JS, attached to window) */
(function () {
  const PESO = "\u20b1";

  function abbrevPHP(n) {
    const neg = n < 0;
    const v = Math.abs(n);
    let out;
    if (v >= 1e9) out = (v / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    else if (v >= 1e6) out = (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    else if (v >= 1e3) out = (v / 1e3).toFixed(0) + "K";
    else out = String(Math.round(v));
    return (neg ? "-" : "") + PESO + out;
  }

  function fullPHP(n) {
    const neg = n < 0;
    const v = Math.abs(Math.round(n));
    return (neg ? "-" : "") + PESO + v.toLocaleString("en-US");
  }

  function commas(n) {
    const neg = n < 0;
    const v = Math.abs(Math.round(n));
    return (neg ? "-" : "") + v.toLocaleString("en-US");
  }

  function pct(x, digits = 2) {
    return (x * 100).toFixed(digits) + "%";
  }

  // Risk semantics ---------------------------------------------------------
  // Cool slate base, semantic risk hues sharing chroma/lightness via oklch.
  const ACTION_STYLE = {
    MAINTAIN: { label: "MAINTAIN", fg: "var(--ink-600)", bg: "transparent", border: "var(--line)", dot: "var(--ink-400)" },
    INCREASE: { label: "INCREASE", fg: "#0f5132", bg: "var(--pos-bg)", border: "var(--pos-bd)", dot: "var(--pos)" },
    DECREASE: { label: "DECREASE", fg: "#7c4a03", bg: "var(--warn-bg)", border: "var(--warn-bd)", dot: "var(--warn)" },
    EXIT:     { label: "EXIT",     fg: "#fff",          bg: "var(--neg)",    border: "var(--neg)",    dot: "#fff" },
  };

  // Full classification set as it actually appears in the sheet (Loss / Fully Paid /
  // SS-NP / blank included — these used to get silently collapsed into "Current").
  const CLASS_STYLE = {
    "Current":    { rank: 0, fg: "var(--pos)",     label: "Current" },
    "Watchlist":  { rank: 1, fg: "var(--info)",    label: "Watchlist" },
    "SM":         { rank: 2, fg: "var(--warn)",    label: "SM" },
    "SS-P":       { rank: 3, fg: "#c2682a",        label: "SS-P" },
    "SS-NP":      { rank: 4, fg: "#8a3a16",        label: "SS-NP" },
    "Doubtful":   { rank: 5, fg: "var(--neg)",     label: "Doubtful" },
    "Loss":       { rank: 6, fg: "#5c1010",        label: "Loss" },
    "Fully Paid": { rank: 7, fg: "#7d8a99",        label: "Fully Paid" },
    "null":       { rank: 8, fg: "var(--ink-300)", label: "Unclassified" },
  };

  const DPD_STYLE = {
    "Current": "var(--pos)",
    "0-29":    "var(--info)",
    "30-59":   "var(--warn)",
    "60-89":   "#c2682a",
    "90+":     "var(--neg)",
  };

  const INDUSTRY_PALETTE = [
    "#2b7ca9", "#4fa23e", "#c2682a", "oklch(0.7 0.14 65)", "#8a3a16",
    "#5c1010", "#7d8a99", "oklch(0.6 0.1 280)", "oklch(0.65 0.12 200)",
  ];

  window.U = { PESO, abbrevPHP, fullPHP, commas, pct, ACTION_STYLE, CLASS_STYLE, DPD_STYLE, INDUSTRY_PALETTE };
})();
