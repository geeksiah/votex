import { describe, expect, it } from "vitest";
import { checkRows, guessField, parseCsv, problemSentences, toCsv } from "./csv";

describe("reading CSV files", () => {
  it("handles quotes, commas, line breaks, Windows endings and the Excel marker", () => {
    const text = '﻿full_name,category\r\n"Owusu, Kwame","Best ""Highlife"" Song"\r\n"Ama\nSerwaa",Best New Artiste\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["full_name", "category"],
      ["Owusu, Kwame", 'Best "Highlife" Song'],
      ["Ama\nSerwaa", "Best New Artiste"],
    ]);
  });

  it("writes back what it reads", () => {
    const rows = [["a,b", 'say "hi"', "plain"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("guesses the field from the heading", () => {
    expect(["full_name", "Category", "photo_url", "Phone Number", "stage_name"].map(guessField)).toEqual(["name", "category", "photo", "phone", "skip"]);
  });
});

describe("checking rows", () => {
  const rows = [
    ["full_name", "category", "phone"],
    ["Kwame Owusu", "best highlife song", "0201184420"],
    ["Yaw Darko", "Best Rap Song", ""],
    ["", "Best Highlife Song", ""],
    ["Ama Serwaa", "", ""],
  ];
  const result = checkRows(rows, ["name", "category", "phone"], ["Best Highlife Song", "Best Gospel Song"]);

  it("matches categories without minding capitals", () => {
    expect(result.ready).toEqual([{ line: 2, name: "Kwame Owusu", category: "Best Highlife Song", photo: "", phone: "0201184420", code: "" }]);
    expect(result.categoriesUsed).toBe(1);
  });

  it("names the rows with problems like the design", () => {
    expect(problemSentences(result.problems)).toEqual([
      "Row 3 names a category that does not exist.",
      "Row 5 has no category.",
      "Row 4 has no name.",
    ]);
    expect(problemSentences([12, 30, 41].map((line) => ({ line, reason: "unknown-category" as const })))).toEqual([
      "Rows 12, 30 and 41 name a category that does not exist.",
    ]);
  });
});
