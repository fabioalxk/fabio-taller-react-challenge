// Unit test for the dev-server proxy fix.
//
//   npm test
//
// Coverage maps to the PR's fix: the proxy key must be a regex ("^/api/") so it
// proxies real API paths but does NOT hijack the client's own "/api.ts" module
// request (a plain "/api" prefix match would 404 the app).
import assert from "node:assert/strict";
import { test } from "node:test";
import config from "./vite.config.ts";

test("vite proxy uses a regex key that matches API paths only", () => {
  const proxy = (config as { server?: { proxy?: Record<string, unknown> } }).server?.proxy ?? {};
  const keys = Object.keys(proxy);

  // Single proxy rule, expressed as a regex (Vite treats keys starting with
  // "^" as regular expressions rather than prefix matches).
  assert.deepEqual(keys, ["^/api/"]);

  const pattern = new RegExp(keys[0]);
  assert.ok(pattern.test("/api/slots"), "should proxy real API paths");
  assert.ok(pattern.test("/api/bookings"), "should proxy real API paths");
  assert.ok(!pattern.test("/api.ts"), "must NOT hijack the client's /api.ts module request");
});
