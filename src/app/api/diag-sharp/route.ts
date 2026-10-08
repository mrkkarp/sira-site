// TEMPORARY: report what the deployed function can see. Remove after.
import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function probe(path: string) {
  try {
    const st = lstatSync(path);
    return {
      path,
      link: st.isSymbolicLink(),
      real: realpathSync(path),
      entries: st.isDirectory() || st.isSymbolicLink() ? readdirSync(path).slice(0, 20) : undefined,
    };
  } catch (e) {
    return { path, error: String(e).slice(0, 120) };
  }
}

export async function GET() {
  const cwd = process.cwd();
  const paths = [
    "node_modules/@img",
    "node_modules/@img/sharp-linux-x64/lib",
    "node_modules/@img/sharp-libvips-linux-x64/lib",
    ".next/node_modules",
    ".next/node_modules/sharp-20c6a5da84e2135f",
    "node_modules/sharp",
  ].map((p) => probe(join(cwd, p)));
  let load: string;
  try {
    await import("sharp");
    load = "ok";
  } catch (e) {
    load = String(e).slice(0, 300);
  }
  return Response.json({
    cwd,
    node: process.version,
    so: existsSync(join(cwd, "node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.3")),
    paths,
    load,
  });
}
