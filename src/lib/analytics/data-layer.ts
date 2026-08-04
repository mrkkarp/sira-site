/**
 * The one channel between this app and any tag.
 *
 * Nothing here knows what GA4, Google Ads or Meta are. The app pushes named
 * events with real numbers into `window.dataLayer`; the GTM container decides
 * which vendors those become. That split is deliberate: tags are edited by
 * whoever runs the marketing, in the GTM UI, without a deploy — and the events
 * are code, in this repository, under test. Wiring gtag.js and the Meta pixel
 * directly into components would have put both halves in the same place and
 * made every measurement change a pull request.
 *
 * The module is safe to import anywhere. On the server `window` does not
 * exist, and every function here is a no-op rather than a crash: analytics is
 * never load-bearing, and a tag helper must never be the reason a page fails
 * to render.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * The queue itself, created on first use.
 *
 * `window.dataLayer = window.dataLayer || []` is the same line Google's own
 * snippet opens with, and for the same reason: whichever of us runs first
 * makes the array, and the other appends to it. Events pushed before the GTM
 * container has finished downloading are not lost — GTM replays the queue from
 * index 0 when it initialises. That is what makes it safe for a click handler
 * to fire an event on a page the visitor leaves immediately.
 */
function dataLayer(): unknown[] | null {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

/** A dataLayer event: a named event plus whatever parameters it carries. */
export type DataLayerEvent = { event: string } & Record<string, unknown>;

/**
 * Push one named event. Returns whether it actually went anywhere, which is
 * what the tests assert on — a silent no-op that reports success is how a
 * measurement plan quietly stops measuring.
 */
export function pushEvent(entry: DataLayerEvent): boolean {
  const queue = dataLayer();
  if (!queue) return false;
  queue.push(entry);
  return true;
}

/**
 * Rebuild a real `arguments` object from an array.
 *
 * This is not a stylistic tic. `gtag()` is defined by Google as
 * `function gtag(){dataLayer.push(arguments)}`, and the container tells gtag
 * commands apart from ordinary events by the *type* of what was pushed: an
 * `Arguments` object is a command (`consent`, `config`, `set`), a plain object
 * is an event. An array is neither, and a `consent` call pushed as an array is
 * accepted by `push` and then ignored — which would leave Consent Mode stuck
 * at its denied defaults with no error anywhere to say so.
 */
function toArguments(args: unknown[]): IArguments {
  // The cast is what lets the spread through: the function takes no declared
  // parameters (it must not — `arguments` is the point), so TypeScript needs
  // to be told its call signature accepts a rest argument.
  const capture = function () {
    // eslint-disable-next-line prefer-rest-params
    return arguments;
  } as (...values: unknown[]) => IArguments;
  return capture(...args);
}

/**
 * A gtag *command* — `consent`, `config`, `set`. Distinct from `pushEvent`
 * above; see `toArguments` for why the distinction is load-bearing.
 */
export function gtag(...args: unknown[]): boolean {
  const queue = dataLayer();
  if (!queue) return false;
  queue.push(toArguments(args));
  return true;
}
