import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BRAND } from "../src/config/brand.js";
import { TRAINING_MEMORY_STORAGE_KEY } from "../src/lib/trainingMemory.js";
import { SAVED_VARIATIONS_STORAGE_KEY } from "../src/lib/variations.js";

const repositoryRoot = new URL("../", import.meta.url);
const publicBrandFiles = [
  "index.html",
  "public/manifest.webmanifest",
  "public/favicon.svg",
  "public/og-recall64.svg",
  "public/robots.txt",
  "public/sitemap.xml",
  "src/App.jsx",
  "README.md",
  "AGENTS.md",
  "AI_CONTEXT.md",
];

test("Recall64 brand contract stays stable across runtime naming", () => {
  assert.equal(BRAND.name, "Recall64");
  assert.equal(BRAND.slug, "recall64");
  assert.equal(BRAND.productionUrl, "https://recall64.vercel.app/");
  assert.equal(BRAND.category, "Private chess opening trainer");
  assert.equal(BRAND.tagline, "Practice openings. Play beyond them.");
});

test("legacy localStorage keys stay unchanged across the rebrand", () => {
  assert.equal(SAVED_VARIATIONS_STORAGE_KEY, "chess-line-memorizer-saved-variations");
  assert.equal(TRAINING_MEMORY_STORAGE_KEY, "opening-lab-training-memory");
});

test("static browser, package, and PWA metadata use Recall64", async () => {
  const indexHtml = await readFile(new URL("index.html", repositoryRoot), "utf8");
  const manifest = JSON.parse(await readFile(new URL("public/manifest.webmanifest", repositoryRoot), "utf8"));
  const packageMetadata = JSON.parse(await readFile(new URL("package.json", repositoryRoot), "utf8"));

  assert.match(indexHtml, /<title>Free Chess Opening Trainer \| Recall64<\/title>/);
  assert.match(indexHtml, /rel="canonical" href="https:\/\/recall64\.vercel\.app\/"/);
  assert.match(indexHtml, /property="og:url" content="https:\/\/recall64\.vercel\.app\/"/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/recall64\.vercel\.app\/og-recall64\.png"/);
  assert.match(indexHtml, /name="apple-mobile-web-app-title" content="Recall64"/);
  assert.equal(manifest.name, "Recall64 — Chess Opening Trainer");
  assert.equal(manifest.short_name, "Recall64");
  assert.equal(packageMetadata.name, "recall64");
});

test("crawler files advertise the canonical Recall64 URL", async () => {
  const robots = await readFile(new URL("public/robots.txt", repositoryRoot), "utf8");
  const sitemap = await readFile(new URL("public/sitemap.xml", repositoryRoot), "utf8");

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/recall64\.vercel\.app\/sitemap\.xml$/m);
  assert.match(sitemap, /<loc>https:\/\/recall64\.vercel\.app\/<\/loc>/);
});

test("public brand surfaces do not regress to a legacy display name", async () => {
  for (const relativePath of publicBrandFiles) {
    const contents = await readFile(new URL(relativePath, repositoryRoot), "utf8");
    assert.equal(contents.includes("The Opening Lab"), false, `${relativePath} uses The Opening Lab`);
    assert.equal(contents.includes("Opening Lab"), false, `${relativePath} uses Opening Lab`);
    assert.equal(contents.includes("Chess Line Memorizer"), false, `${relativePath} uses Chess Line Memorizer`);
  }
});
