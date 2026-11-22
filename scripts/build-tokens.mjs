// Builds src/styles/tokens.css from design/tokens.json (exported from the Figma vx variables).
// Run: pnpm tokens. CI fails if the CSS is out of date (see src/styles/tokens.test.ts).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function buildTokensCss(tokens) {
  const ref = (v) => (v.startsWith("#") ? v : `var(--vx-${v})`);
  const lines = ["/* Generated from design/tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */", ":root {"];
  for (const [k, v] of Object.entries(tokens.primitives)) lines.push(`  --vx-${k}: ${v};`);
  for (const [k, v] of Object.entries(tokens.space)) lines.push(`  --vx-space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(tokens.radius)) lines.push(`  --vx-radius-${k}: ${v}px;`);
  const mode = (m) => Object.entries(tokens.color).map(([k, v]) => `  --vx-color-${k}: ${ref(v[m])};`);
  lines.push(...mode("light"), "  color-scheme: light;", "}", "");
  lines.push(":root[data-theme=\"dark\"] {", ...mode("dark"), "  color-scheme: dark;", "}", "");
  lines.push("@media (prefers-color-scheme: dark) {", "  :root:not([data-theme=\"light\"]) {", ...mode("dark").map((l) => "  " + l), "    color-scheme: dark;", "  }", "}", "");
  for (const [k, t] of Object.entries(tokens.text)) {
    lines.push(`@utility vx-${k} {`, `  font-size: ${t.size}px;`, `  font-weight: ${t.weight};`, `  line-height: ${t.lineHeight};`);
    if (t.tracking) lines.push(`  letter-spacing: ${t.tracking}em;`);
    lines.push("}");
  }
  return lines.join("\n") + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("..", import.meta.url);
  const tokens = JSON.parse(readFileSync(new URL("design/tokens.json", root), "utf8"));
  writeFileSync(new URL("src/styles/tokens.css", root), buildTokensCss(tokens));
  console.log("Wrote src/styles/tokens.css");
}
