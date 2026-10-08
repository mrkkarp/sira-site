/**
 * Adds sharp's native binaries to the proxy's trace after `next build`.
 *
 * `src/proxy.ts` reaches Payload through `findLegacyRedirect`, and
 * `payload.config.ts` imports sharp at module scope — so the proxy loads
 * sharp on every page request. Turbopack traces sharp's JS and its `.node`
 * addon into `middleware.js.nft.json`, but not the `libvips-cpp.so` the addon
 * links against: that file is reached only through the addon's rpath, which
 * no tracer follows. And `outputFileTracingIncludes` cannot patch it in — Next
 * applies it to app and pages entries only, never to the proxy.
 *
 * On 2026-10-08 a build ran without Vercel's cache, the proxy shipped without
 * libvips, and every page on odudlab.com answered 500 ("libvips-cpp.so.8.18.3:
 * cannot open shared object file") until production was rolled back. Whatever
 * the cache used to supply by accident, this supplies on purpose.
 *
 * Adds every `@img/sharp-*` package actually installed next to the root
 * `sharp`, so it is right on any platform: the Linux packages on Vercel, the
 * darwin ones on a local build. Fails loudly if the proxy trace is missing —
 * a silently skipped patch is how this broke in the first place.
 *
 *   node scripts/trace-sharp-into-proxy.mjs     # run by `npm run build`
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const traceFile = join(root, ".next/server/middleware.js.nft.json");
const imgDir = join(root, "node_modules/@img");

if (!existsSync(traceFile)) {
  console.error(
    `[trace-sharp] ${relative(root, traceFile)} not found — did the proxy move?`,
  );
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const packages = existsSync(imgDir)
  ? readdirSync(imgDir).filter((name) => name.startsWith("sharp-"))
  : [];
const files = packages.flatMap((name) => walk(join(imgDir, name)));

const trace = JSON.parse(readFileSync(traceFile, "utf8"));
const listed = new Set(trace.files);
const traceDir = dirname(traceFile);
let added = 0;
for (const file of files) {
  const entry = relative(traceDir, file);
  if (!listed.has(entry)) {
    trace.files.push(entry);
    listed.add(entry);
    added += 1;
  }
}
writeFileSync(traceFile, JSON.stringify(trace));

const libvips = files.filter((file) => /libvips-cpp\./.test(file));
console.log(
  `[trace-sharp] ${added} file(s) added to the proxy trace from ${packages.join(", ") || "no @img/sharp-* packages"}; libvips: ${libvips.map((f) => relative(root, f)).join(", ") || "none"}`,
);
