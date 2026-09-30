// Builds index.html: bundles src/ with esbuild and inlines CSS + JS into one self-contained page.
// React and ReactDOM load at runtime from cdnjs, falling back to jsDelivr.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  format: "iife",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  minify: true,
  target: "es2019",
  write: false,
});
const app = result.outputFiles[0].text;
if (app.includes("</script")) throw new Error("bundle contains </script");
const css = readFileSync("src/styles.css", "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>The Round Market</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📈</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<style>
${css}
.boot { max-width: 520px; margin: 18vh auto 0; padding: 0 20px; color: var(--muted); }
</style>
</head>
<body>
<div id="root"><p class="boot">Loading the market…</p></div>
<script>
window.__startRoundMarket = function () {
${app}
};
</script>
<script>
(function () {
  var libs = [
    ["https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
     "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"],
    ["https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
     "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"]
  ];
  function fail() {
    document.getElementById("root").innerHTML =
      '<p class="boot">The game could not load its interface library. Check your connection and reload the page.</p>';
  }
  function load(i) {
    if (i === libs.length) {
      if (window.React && window.ReactDOM && window.ReactDOM.createRoot) window.__startRoundMarket(); else fail();
      return;
    }
    var urls = libs[i], j = 0;
    (function tryNext() {
      if (j === urls.length) return fail();
      var s = document.createElement("script");
      s.src = urls[j++];
      s.onload = function () { load(i + 1); };
      s.onerror = function () { s.remove(); tryNext(); };
      document.head.appendChild(s);
    })();
  }
  load(0);
})();
</script>
</body>
</html>
`;
writeFileSync("index.html", html);
console.log(`index.html written (${(html.length / 1024).toFixed(1)} KB)`);
