import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the browser is made to download, checked at the only moment it is cheap
 * to check: while reading the source.
 *
 * The regression this exists for shipped for months without anyone noticing.
 * `search-drawer.tsx` needed the list of shop categories to render its chips —
 * seven strings — and imported them from `@/lib/schemas/product`, whose first
 * line is `import { z } from "zod"`. The search drawer is in the header, the
 * header is on every page, and so every page carried zod's entire runtime:
 * ~277 kB uncompressed, on the homepage and the contact page, neither of which
 * validates anything. `shop-filters.ts` did the same for `/shop` with two more
 * tuples.
 *
 * Nothing catches this by looking at the site. The pages render correctly, the
 * tests pass, and the only symptom is a number nobody is looking at. It is also
 * a single-character mistake to reintroduce — one import path — which is what
 * makes it worth a test rather than a comment.
 *
 * So: walk out from every `"use client"` module, follow the imports that
 * actually survive to runtime, and fail if zod is reachable from anywhere it
 * has no business being.
 */

const SRC = path.join(process.cwd(), "src");

/**
 * The client components that legitimately validate in the browser.
 *
 * These forms check the shopper's phone and email *before* posting, so the
 * schema has to be on the client — the alternative is a round-trip to learn
 * that a digit is missing. They are all behind a click (a lazily-imported
 * consultation form, the warranty page, the checkout page), so the cost falls
 * on the people who asked for it rather than on everyone.
 */
const MAY_USE_ZOD = new Set([
  "components/product/quote-request-form.tsx",
  "components/forms/warranty-request-form.tsx",
  "components/checkout/checkout-page-content.tsx",
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}

/**
 * The specifiers a module still imports once TypeScript has erased the types.
 *
 * `import type { Product }` and `import { type Product }` both vanish at
 * compile time and cost the browser nothing — that distinction is the whole
 * point here, since `shop-filters.ts` imports both a type and a value from the
 * same schema module and only the value was ever the problem.
 */
function runtimeImports(file: string): string[] {
  // Comments first, and not as a nicety: several modules *discuss* their
  // imports in prose — `product-categories.ts` explains that it exists because
  // the schema module's first line is `import { z } from "zod"` — and a
  // scanner that reads that sentence as an import reports the very file that
  // fixed the problem as the cause of it. Block comments go first so a JSDoc
  // line never survives as a stray `*`; `//` is only treated as a comment when
  // it does not follow a `:`, so a URL in a string stays intact.
  const source = fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const specifiers: string[] = [];

  const pattern =
    /(?:import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']/g;
  for (const [, typeKeyword, clause, specifier] of source.matchAll(pattern)) {
    if (typeKeyword) continue;

    const named = clause.match(/\{([\s\S]*)\}/)?.[1];
    const isSideEffectFreeTypeOnly =
      named !== undefined &&
      clause.trim().startsWith("{") &&
      named
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .every((name) => name.startsWith("type "));
    if (isSideEffectFreeTypeOnly) continue;

    specifiers.push(specifier);
  }
  return specifiers;
}

/** Resolves `@/…` and relative specifiers to a file on disk, or `null`. */
function resolve(specifier: string, importer: string): string | null {
  const base = specifier.startsWith("@/")
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(importer), specifier)
      : null;
  if (!base) return null;

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** The import chain from `entry` to zod, or `null` if there isn't one. */
function pathToZod(entry: string): string[] | null {
  const queue: Array<{ file: string; trail: string[] }> = [
    { file: entry, trail: [path.relative(SRC, entry)] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { file, trail } = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    for (const specifier of runtimeImports(file)) {
      if (specifier === "zod") return [...trail, "zod"];
      const next = resolve(specifier, file);
      if (next && !visited.has(next)) {
        queue.push({ file: next, trail: [...trail, path.relative(SRC, next)] });
      }
    }
  }
  return null;
}

describe("client bundle", () => {
  const clientEntries = sourceFiles(SRC).filter((file) =>
    /^\s*(["'])use client\1/.test(fs.readFileSync(file, "utf8")),
  );

  it("finds the client components to check", () => {
    // A resolver or convention change that quietly empties this list would make
    // every assertion below vacuously true.
    expect(clientEntries.length).toBeGreaterThan(10);
  });

  it("keeps zod out of every client component that does not validate input", () => {
    const offenders = clientEntries
      .filter((file) => !MAY_USE_ZOD.has(path.relative(SRC, file)))
      .map((file) => ({ file: path.relative(SRC, file), via: pathToZod(file) }))
      .filter((entry) => entry.via !== null);

    expect(
      offenders.map((entry) => entry.via!.join(" → ")),
      "a client component now reaches zod, which puts its whole runtime " +
        "(~277 kB) in the browser. If it is only after a constant, import it " +
        "from a module that has no dependencies — `lib/schemas/product-" +
        "categories.ts` exists for exactly this. If it genuinely validates " +
        "user input, add it to MAY_USE_ZOD and load it lazily",
    ).toEqual([]);
  });

  it("still sees the allowed forms reaching zod", () => {
    // Guards the guard: if a refactor made zod unreachable from these three,
    // the allowlist would be stale and the test above would be checking a
    // narrower set than it claims to.
    for (const allowed of MAY_USE_ZOD) {
      expect(pathToZod(path.join(SRC, allowed)), allowed).not.toBeNull();
    }
  });
});
