// Reading contestant CSV files (O7 · Import CSV). Handles quotes, commas and line breaks inside quotes,
// Windows line endings and the byte-order mark Excel adds.

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ImportField = "name" | "category" | "photo" | "phone" | "code" | "skip";

export const FIELD_LABEL: Record<ImportField, string> = {
  name: "Name voters see",
  category: "Category",
  photo: "Photo",
  phone: "Phone",
  code: "Voting code",
  skip: "Do not import",
};

/** Best guess of the Votex field for a column heading. */
export function guessField(heading: string): ImportField {
  const h = heading.toLowerCase().replace(/[^a-z]/g, "");
  if (["name", "fullname", "contestant", "contestantname", "nominee", "nomineename"].includes(h)) return "name";
  if (["category", "categoryname", "award"].includes(h)) return "category";
  if (["photo", "photourl", "photolink", "image", "imageurl", "picture"].includes(h)) return "photo";
  if (["phone", "phonenumber", "mobile", "tel", "telephone", "momo"].includes(h)) return "phone";
  if (["code", "votingcode", "contestantcode"].includes(h)) return "code";
  return "skip";
}

export type ImportRow = { line: number; name: string; category: string; photo: string; phone: string; code: string };
export type CheckedImport = {
  ready: ImportRow[];
  problems: { line: number; reason: "no-name" | "no-category" | "unknown-category" }[];
  categoriesUsed: number;
};

/** Applies the column choices and checks every row against the event's categories. */
export function checkRows(rows: string[][], fields: ImportField[], categories: string[]): CheckedImport {
  const known = new Map(categories.map((c) => [c.trim().toLowerCase(), c]));
  const col = (f: ImportField) => fields.indexOf(f);
  const get = (r: string[], f: ImportField) => (col(f) >= 0 ? (r[col(f)] ?? "").trim() : "");
  const ready: ImportRow[] = [];
  const problems: CheckedImport["problems"] = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2; // spreadsheet row number: the headings are row 1
    const name = get(r, "name");
    const category = get(r, "category");
    if (!name) return problems.push({ line, reason: "no-name" });
    if (!category) return problems.push({ line, reason: "no-category" });
    const match = known.get(category.toLowerCase());
    if (!match) return problems.push({ line, reason: "unknown-category" });
    ready.push({ line, name, category: match, photo: get(r, "photo"), phone: get(r, "phone"), code: get(r, "code").toUpperCase() });
  });
  return { ready, problems, categoriesUsed: new Set(ready.map((r) => r.category)).size };
}

/** "Rows 12, 30 and 41". */
export function rowList(lines: number[]): string {
  if (lines.length === 1) return `Row ${lines[0]}`;
  return `Rows ${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`;
}

/** One sentence per kind of problem, e.g. "Rows 12, 30 and 41 name a category that does not exist." */
export function problemSentences(problems: CheckedImport["problems"]): string[] {
  const by = (r: string) => problems.filter((p) => p.reason === r).map((p) => p.line);
  const out: string[] = [];
  const unknown = by("unknown-category");
  const noCat = by("no-category");
  const noName = by("no-name");
  if (unknown.length) out.push(`${rowList(unknown)} ${unknown.length === 1 ? "names a category that does" : "name a category that does"} not exist.`);
  if (noCat.length) out.push(`${rowList(noCat)} ${noCat.length === 1 ? "has" : "have"} no category.`);
  if (noName.length) out.push(`${rowList(noName)} ${noName.length === 1 ? "has" : "have"} no name.`);
  return out;
}

export function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export const EXAMPLE_CSV = toCsv([
  ["full_name", "category", "photo_url", "phone"],
  ["Kwame Owusu", "Best Highlife Song", "", "0201184420"],
  ["Akosua Boateng", "Best Gospel Song", "", "0244512378"],
  ["Kobby Asiedu", "Best Afrobeats Song", "", ""],
]);
