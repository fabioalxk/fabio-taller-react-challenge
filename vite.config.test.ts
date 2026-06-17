import assert from "node:assert/strict";
import { test } from "node:test";
import config from "./vite.config.ts";

test("vite proxy uses a regex key that matches API paths only", () => {
  const proxy = (config as { server?: { proxy?: Record<string, unknown> } }).server?.proxy ?? {};
  const keys = Object.keys(proxy);

  // Vite treats keys starting with "^" as regexes, not prefix matches.
  assert.deepEqual(keys, ["^/api/"]);

  const pattern = new RegExp(keys[0]);
  assert.ok(pattern.test("/api/slots"), "should proxy real API paths");
  assert.ok(pattern.test("/api/bookings"), "should proxy real API paths");
  assert.ok(!pattern.test("/api.ts"), "must NOT hijack the client's /api.ts module request");
});
