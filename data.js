/* Pro Credit — Supabase data loader
   Pulls loan + repayment data live from Supabase and builds window.PORTFOLIO.

   Auth: uses the anon/public API key. This is safe to ship to the browser
   ONLY because RLS on both tables grants read-only SELECT to anon and no
   insert/update/delete policy exists. Do not swap this for the service_role key.
*/
(function () {
  var SUPABASE_URL = "https://bvpchotzhqzwbxwninon.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cGNob3R6aHF6d2J4d25pbm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTI0MDIsImV4cCI6MjA5NzQyODQwMn0.diJ3uEDcuZa31wrDfvpyOX98sVySxcYadqGISsSDJ8s";
  var LOAN_TABLE = "ProCredit Loan Database";
  var REPAYMENT_TABLE = "ProCredit Repayment Database";
  var CLASSIFICATION_TABLE = "ProCredit  Classification Data";

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ---- parsers ---- */
  function parseNum(v) {
    if (v == null || v === "" || v === "-" || v === "N/A") return 0;
    return parseFloat(String(v).replace(/,/g, "").replace(/%/g, "")) || 0;
  }

  function dpdToBucket(dpd) {
    if (dpd <= 0) return "Current";
    if (dpd <= 29) return "0-29";
    if (dpd <= 59) return "30-59";
    if (dpd <= 89) return "60-89";
    return "90+";
  }

  /* ---- classification (custom_field_20375) ----
     Loandisk stores "D" as shorthand for Doubtful; blank/null means the loan
     was never (re)classified, usually closed-out loans — kept as "null" so it
     still renders via util.js's CLASS_STYLE["null"] (Unclassified). */
  var CLASS_ORDER = ["Current", "Watchlist", "SM", "SS-P", "SS-NP", "Doubtful", "Loss", "Fully Paid"];
  function normalizeClassification(raw) {
    var s = (raw == null ? "" : String(raw)).trim();
    if (!s) return "null";
    if (s === "D") return "Doubtful";
    return s;
  }
  function classRank(c) { return CLASS_ORDER.indexOf(c); } // -1 for unknown/null

  /* ---- action ----
     No analyst-entered recommendation exists in Supabase (unlike the old sheet),
     so this is a system-derived suggestion from classification + DPD, surfaced
     to the user as such rather than presented as expert judgment. */
  function deriveAction(classification, dpd) {
    if (classification === "Doubtful" || classification === "Loss" || dpd >= 90) return "EXIT";
    if (classification === "SM" || classification === "SS-P" || classification === "SS-NP" ||
        classification === "Watchlist" || dpd >= 30) return "DECREASE";
    return "MAINTAIN";
  }

  /* ---- industry grouping ----
     Merges near-duplicate spellings (typos/casing/punctuation) and closely
     related sub-types under one umbrella label, so the Industry charts read
     as one slice instead of fragmenting across near-identical entries.
     Exact-string aliases catch true duplicates; keyword patterns catch
     same-topic sub-types (e.g. "IT Hardware" / "IT Solutions" / "Information
     Technology" all become one "IT / Information Technology" slice). */
  var INDUSTRY_ALIASES = {
    "meat dist": "Meat Dist.",
    "meat dist.": "Meat Dist.",
    "lend co": "Finance / Lending Co.",
    "lendco": "Finance / Lending Co.",
    "fin co": "Finance / Lending Co.",
    "epc contractor": "Construction",
    "fabrication & fit out": "Construction",
    "cement dist.": "Construction",
  };
  var INDUSTRY_KEYWORDS = [
    { test: /\bit\b|information technology/i, label: "IT / Information Technology" },
    { test: /\bagri/i, label: "Agriculture" },
    { test: /\bappliance/i, label: "Appliances" },
    { test: /\bf&b\b|\bfood\b/i, label: "Food / F&B" },
    { test: /\bbatter(y|ies)\b/i, label: "Battery / UPS Dist." },
    { test: /\bconstruction\b/i, label: "Construction" },
    { test: /\belectr(ical|onic)/i, label: "Electrical & Electronics" },
    { test: /\beng(\.|ineering)/i, label: "Engineering" },
    { test: /\bmedical\b|healthcare|pharmaceutical/i, label: "Medical & Healthcare" },
    { test: /\bmanpower\b/i, label: "Manpower" },
    { test: /\brice\b/i, label: "Rice" },
  ];

  function industryGroup(raw) {
    var key = raw.trim().toLowerCase();
    if (INDUSTRY_ALIASES[key]) return INDUSTRY_ALIASES[key];
    for (var i = 0; i < INDUSTRY_KEYWORDS.length; i++) {
      if (INDUSTRY_KEYWORDS[i].test.test(raw)) return INDUSTRY_KEYWORDS[i].label;
    }
    return raw;
  }

  /* ---- economic group ----
     Loandisk has no concept of a parent/economic group — borrower_business_name
     is one legal entity per loan. The credit team's Sheet manually rolls a handful
     of affiliated entities up under one parent for concentration reporting (e.g.
     ADP Pharma + Seville share ownership and both count against "Ondarea Group"'s
     exposure limit). Sourced from the Sheet's "Economic Group" column — everything
     not listed here is already its own group (business name === economic group). */
  var ECONOMIC_GROUP_ALIASES = {
    "antech": "Antech Group",
    "belrose": "Antech Group",
    "adp pharma": "Ondarea Group",
    "seville": "Ondarea Group",
    "sv supreme": "SV Group",
    "gadget spot": "SV Group",
    "power serve": "PSI Group",
    "psi tech": "PSI Group",
    "mohs": "Waterside Holdings",
    "zenfro": "Waterside Holdings",
    "manila hemp": "Manila Hemp Group",
    "acc hypermart": "Manila Hemp Group",
  };
  // Loans with no borrower_business_name (personal-name borrowers) that still
  // roll up into a named Economic Group, keyed by borrower_id.
  var BORROWER_ID_GROUP_OVERRIDE = {
    5906496: "Synergy Sourcing", // Dexter C. Dy
    6171493: "Synergy Sourcing", // Janice Elaine G. Dy
  };
  function economicGroupFor(businessName, borrowerId) {
    if (BORROWER_ID_GROUP_OVERRIDE[borrowerId]) return BORROWER_ID_GROUP_OVERRIDE[borrowerId];
    var key = (businessName || "").trim().toLowerCase();
    return ECONOMIC_GROUP_ALIASES[key] || businessName || ("Borrower " + borrowerId);
  }

  /* ---- fetch helpers ---- */
  function fetchAll(table, columns) {
    var pageSize = 1000;
    var out = [];
    function loop(from) {
      return supabase.from(table).select(columns).range(from, from + pageSize - 1)
        .then(function (res) {
          if (res.error) throw new Error(table + ": " + res.error.message);
          out = out.concat(res.data);
          if (res.data.length < pageSize) return out;
          return loop(from + pageSize);
        });
    }
    return loop(0);
  }

  /* ---- main builder ---- */
  function buildPortfolio(loanRows, repaymentRows, classOverrides) {
    classOverrides = classOverrides || {};
    if (!loanRows.length) throw new Error("No loans returned from Supabase — check RLS policy grants SELECT to anon.");

    var interestByLoan = {};
    repaymentRows.forEach(function (rp) {
      interestByLoan[rp.loan_id] = (interestByLoan[rp.loan_id] || 0) + parseNum(rp.interest_repayment_amount);
    });

    var byGroup = {};
    loanRows.forEach(function (l) {
      var key = economicGroupFor(l.borrower_business_name, l.borrower_id);
      (byGroup[key] = byGroup[key] || []).push(l);
    });

    var rows = [];
    var id = 0;
    Object.keys(byGroup).forEach(function (key) {
      var loans = byGroup[key];
      id++;

      // Loandisk doesn't zero out a loan's balance when it's restructured into a new
      // loan — the old loan (loan_status_id 4) keeps showing its stale pre-restructure
      // balance forever, while a new loan_id carries the real current obligation.
      // Status 3 behaves the same way (confirmed against the live Credit Engine total).
      // Summing either double-counts the exposure, so balance/risk math only looks at
      // live loans; interest already collected against the old loan is still real cash.
      var liveLoans = loans.filter(function (l) { return l.loan_status_id !== 4 && l.loan_status_id !== 3; });

      // "Primary" loan drives display-only attributes only (industry/tier/bracket/name) —
      // falls back to the full loan list so a group with no live loans still has something
      // to display, but this must never feed back into the financial sums below, or it
      // re-introduces the stale-balance double-count liveLoans exists to prevent.
      var primary = (liveLoans.length ? liveLoans : loans).slice().sort(function (a, b) {
        var d = parseNum(b.principal_balance_amount) - parseNum(a.principal_balance_amount);
        return d !== 0 ? d : parseNum(b.loan_principal_amount) - parseNum(a.loan_principal_amount);
      })[0];

      // Use analyst override from ProCredit Group Classifications table if present;
      // otherwise fall back to worst-case across live loans in Loandisk.
      var classification;
      if (classOverrides[key] != null) {
        classification = classOverrides[key];
      } else {
        classification = "null";
        var worstRank = -1;
        liveLoans.forEach(function (l) {
          var c = normalizeClassification(l.custom_field_20375);
          var r = classRank(c);
          if (r > worstRank) { worstRank = r; classification = c; }
        });
      }

      var dpd = liveLoans.reduce(function (m, l) {
        if (parseNum(l.principal_balance_amount) <= 0) return m; // zero-balance loans carry no exposure — don't let their DPD drive the action
        return Math.max(m, Math.max(0, Math.round(parseNum(l.days_past_due))));
      }, 0);
      var principalBalance = liveLoans.reduce(function (s, l) { return s + parseNum(l.principal_balance_amount); }, 0);
      var overduePrincipal = liveLoans.reduce(function (s, l) { return s + parseNum(l.pending_due_principal); }, 0);
      var grossDisb = liveLoans.reduce(function (s, l) { return s + parseNum(l.loan_principal_amount); }, 0);
      var interest = loans.reduce(function (s, l) { return s + (interestByLoan[l.loan_id] || 0); }, 0);
      var industry = (primary.custom_field_19601 || "").toString().trim();

      rows.push({
        id: id,
        borrowerIds: Array.from(new Set(loans.map(function (l) { return l.borrower_id; }))),
        economicGroup: key,
        legalName: (primary.custom_field_19606 || "").toString().trim(),
        classification: classification,
        riskTier: (primary.custom_field_20418 || "").toString().trim() || "null",
        industry: industry,
        industryGroup: industry ? industryGroup(industry) : industry,
        revenueBracket: (primary.custom_field_19600 || "").toString().trim(),
        exposureToRevenuePct: parseNum(primary.custom_field_20379) / 100,
        principalBalance: principalBalance,
        overduePrincipal: overduePrincipal,
        pctPortfolio: 0,
        action: deriveAction(classification, dpd),
        dpd: dpd,
        dpdBucket: dpdToBucket(dpd),
        loanCount: liveLoans.length,
        hasRestructured: loans.some(function (l) { return !!l.restructured_loan_history; }),
        loans: liveLoans.map(function (l) {
          return {
            loanId: l.loan_id,
            statusId: l.loan_status_id,
            principalBalance: parseNum(l.principal_balance_amount),
            originalPrincipal: parseNum(l.loan_principal_amount),
            dpd: Math.max(0, Math.round(parseNum(l.days_past_due))),
            dueDate: l.due_date,
            releasedDate: l.loan_released_date,
          };
        }),
        _grossDisb: grossDisb,
        _interest: interest,
      });
    });

    var totalPrincipal = rows.reduce(function (s, r) { return s + r.principalBalance; }, 0);
    rows.forEach(function (r) { r.pctPortfolio = totalPrincipal ? r.principalBalance / totalPrincipal : 0; });
    rows.sort(function (a, b) { return b.principalBalance - a.principalBalance; });

    var clsSet = {};
    rows.forEach(function (r) { clsSet[r.classification] = true; });
    var classifications = CLASS_ORDER.filter(function (c) { return clsSet[c]; });
    if (clsSet["null"]) classifications.push("null");

    function tierSortKey(t) {
      var m = String(t).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    }
    var riskTierSet = {};
    rows.forEach(function (r) { riskTierSet[r.riskTier] = true; });
    var riskTiers = Object.keys(riskTierSet).sort(function (a, b) { return tierSortKey(a) - tierSortKey(b); });

    function bracketSortKey(label) {
      var s = String(label).toLowerCase();
      var isLess = s.trim().charAt(0) === "<";
      var isMore = s.trim().charAt(0) === ">";
      var m = s.match(/([\d.]+)\s*(b|m)?/);
      var num = m ? parseFloat(m[1]) : 0;
      if (m && m[2] === "b") num *= 1000;
      if (isLess) num -= 0.001;
      if (isMore) num += 100000;
      return num;
    }

    var now = new Date();
    var updated = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + " " +
      now.toTimeString().slice(0, 8);

    var totalInterest = rows.reduce(function (s, r) { return s + r._interest; }, 0);
    var totalGrossDisb = rows.reduce(function (s, r) { return s + r._grossDisb; }, 0);
    var activeLoans = loanRows.filter(function (l) { return l.loan_status_id !== 4 && l.loan_status_id !== 3 && parseNum(l.principal_balance_amount) > 0; }).length;

    return {
      rows: rows,
      totals: {
        principalBalance: totalPrincipal,
        interestCollected: totalInterest,
        borrowers: rows.filter(function (r) { return r.principalBalance > 0; }).length,
        grossDisbursals: totalGrossDisb,
        overduePrincipal: rows.reduce(function (s, r) { return s + r.overduePrincipal; }, 0),
        activeLoans: activeLoans,
      },
      meta: {
        updated: updated,
        classifications: classifications,
        riskTiers: riskTiers,
        actions: ["MAINTAIN", "INCREASE", "DECREASE", "EXIT"],
        dpdBuckets: ["Current", "0-29", "30-59", "60-89", "90+"],
        industries: Array.from(new Set(rows.map(function (r) { return r.industry; }).filter(Boolean))).sort(),
        industryGroups: Array.from(new Set(rows.map(function (r) { return r.industryGroup; }).filter(Boolean))).sort(),
        revenueBrackets: Array.from(new Set(rows.map(function (r) { return r.revenueBracket; }).filter(Boolean)))
                            .sort(function (a, b) { return bracketSortKey(a) - bracketSortKey(b); }),
      },
    };
  }

  window.loadPortfolio = function () {
    return Promise.all([
      fetchAll(LOAN_TABLE, "*"),
      fetchAll(REPAYMENT_TABLE, "loan_id,interest_repayment_amount"),
      fetchAll(CLASSIFICATION_TABLE, "*"),
    ]).then(function (results) {
      var classOverrides = {};
      results[2].forEach(function (r) {
        if (r["Current Class."]) classOverrides[r["GROUP NAME"]] = r["Current Class."];
      });
      var portfolio = buildPortfolio(results[0], results[1], classOverrides);
      window.PORTFOLIO = portfolio;
      return portfolio;
    });
  };
})();
