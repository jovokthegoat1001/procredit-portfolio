// Concatenates the app's source files (in their existing load order — they're
// plain scripts sharing one global scope via window.*, not ES modules, so
// this is a straight text concatenation, not a real module bundle) and runs
// the result through esbuild's JSX transform + minifier. Output goes to
// public/, the only folder actually deployed — src/ never ships.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const SRC_DIR = path.join(__dirname, "src");
const OUT_DIR = path.join(__dirname, "public");

const FILES_IN_ORDER = [
  "data.js",
  "util.js",
  "charts.jsx",
  "analytics.jsx",
  "groupreport.jsx",
  "login.jsx",
  "app.jsx",
];

// As separate <script> tags in the browser, each file safely redeclares its own
// `const { useX } = React` — but concatenated into one file for bundling, the
// bare (non-aliased) destructuring in login.jsx collides with app.jsx's, which
// already covers the same names (useState/useEffect/useRef) plus useMemo. Only
// login.jsx's copy is stripped; by the time its components actually run (React
// rendering, after the whole bundle has executed top to bottom), app.jsx's
// declaration further down the same file is already initialized.
function stripDuplicateHookDestructure(filename, content) {
  if (filename !== "login.jsx") return content;
  return content.replace(/^const \{ useState, useEffect, useRef \} = React;\n/, "");
}

async function build() {
  const combined = FILES_IN_ORDER
    .map((f) => stripDuplicateHookDestructure(f, fs.readFileSync(path.join(SRC_DIR, f), "utf8")))
    .join("\n;\n");

  const result = await esbuild.transform(combined, {
    loader: "jsx",
    jsx: "transform", // React.createElement, matching Babel-standalone's classic runtime
    minify: true,
    target: "es2018",
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "bundle.min.js"), result.code);
  console.log(`Built public/bundle.min.js (${(result.code.length / 1024).toFixed(1)} KB)`);
}

build().catch((err) => { console.error(err); process.exit(1); });
