// Vitest-only stand-in for the `server-only` package (see vitest.config.ts's
// `resolve.alias`). `server-only` itself is only resolvable inside Next's
// own webpack build (it isn't a listed npm dependency here), so any module
// under test that does `import "server-only"` needs this alias to import
// cleanly under plain Node/jsdom. Next.js's own real `server-only` package
// is a no-op unless bundled for the browser, so an empty module here is a
// faithful stand-in for tests (which never run in an actual browser).
export {};
