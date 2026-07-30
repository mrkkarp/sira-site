import "server-only";
import { getPayload, type Payload } from "payload";
import config from "@payload-config";

/**
 * Cached Payload Local API client (Prompt 8 §0/§3, Phase B). Every
 * Payload-backed repository goes through this one function rather
 * than each calling `getPayload({ config })` itself — not for
 * correctness (Payload's own `getPayload` already caches per-config
 * internally, see `node_modules/payload/dist/index.js`), but so there
 * is exactly one place a future test suite mocks/stubs to swap in a
 * fake Payload instance.
 *
 * `"server-only"` guards against this ever being pulled into a client
 * bundle — the whole point of the repository layer (§0's "UI не має
 * напряму імпортувати JSON/ORM/DB") is that nothing above the
 * repository boundary touches Payload/Postgres directly.
 */
export async function getPayloadClient(): Promise<Payload> {
  return getPayload({ config });
}
