import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const storage = new Map([["heledone.language", "en"]]);
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const server = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom" });
try {
  const { languages, useLocaleStore, t, getDirection, formatNumber } = await server.ssrLoadModule("/src/i18n/locale.ts");
  const { formatDisplayDate } = await server.ssrLoadModule("/src/utils/date.ts");
  const { formatDuration } = await server.ssrLoadModule("/src/i18n/formatters.ts");
  const { getWorkflowAppearance } = await server.ssrLoadModule("/src/core/config/designTokens.ts");
  const { loginSchema, registerSchema } = await server.ssrLoadModule("/src/features/auth/validation/authSchema.ts");
  const { default: api } = await server.ssrLoadModule("/src/core/config/axiosClient.ts");
  const requestLanguage = async () => (await api.get("/locale-check", { adapter: async (config) => ({ data: config.headers.get("Accept-Language"), status: 200, statusText: "OK", headers: {}, config }) })).data;
  const [fa, en] = languages;

  assert.equal(useLocaleStore.getState().locale, "en", "restore the saved language before rendering");
  assert.deepEqual(Object.keys(fa.messages).sort(), Object.keys(en.messages).sort(), "catalogs must contain the same messages");
  const placeholders = (message) => [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, message] of Object.entries(fa.messages)) {
    assert.ok(message.trim(), `empty Persian translation: ${key}`);
    assert.ok(en.messages[key].trim(), `empty English translation: ${key}`);
    assert.deepEqual(placeholders(message), placeholders(en.messages[key]), `interpolation mismatch: ${key}`);
  }

  const missing = [];
  async function checkSource(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { if (!["mocks", "i18n"].includes(entry.name)) await checkSource(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isCallExpression(node) && ["t", "translate"].includes(node.expression.getText(source)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text;
          if (!Object.hasOwn(en.messages, key)) missing.push(`${path.relative(root, file)}: ${key}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  await checkSource(path.join(root, "src"));
  assert.deepEqual(missing, [], "every literal UI message needs a catalog entry");

  assert.equal(t("تنظیمات حساب"), "Account settings");
  assert.equal(getDirection(), "ltr");
  assert.equal(await requestLanguage(), "en");
  assert.equal(loginSchema.safeParse({ username: "", password: "" }).error.issues[0].message, "Username is required");
  assert.equal(getWorkflowAppearance({ category: "done", name: "انجام‌شده" }).label, "Done");
  assert.equal(getWorkflowAppearance({ category: "done", name: "آماده انتشار API v2" }).label, "آماده انتشار API v2", "preserve custom status names");
  assert.equal(t("Open {section}", { section: "API v2 — طرح فارسی" }), "Open API v2 — طرح فارسی");
  assert.equal(formatNumber(1234567.5), "1,234,567.5");
  const nowruz = new Date("2025-03-21T12:00:00Z");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "jalali"), "1404-01-01");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "gregorian"), "2025-03-21");
  assert.equal(formatDuration(5400), "1h 30m");

  useLocaleStore.getState().setLocale("fa");
  assert.equal(storage.get("heledone.language"), "fa", "persist a changed preference");
  assert.equal(getDirection(), "rtl");
  assert.equal(await requestLanguage(), "fa", "the API preference follows language changes without rebuilding the client");
  assert.equal(t("Interface language"), "زبان رابط");
  assert.equal(loginSchema.safeParse({ username: "", password: "" }).error.issues[0].message, "نام کاربری را وارد کنید", "reused schemas must follow the active language");
  const invalidPassword = registerSchema.safeParse({ username: "sara", email: "sara@example.com", password: "Abc12345", password_confirm: "different" });
  assert.equal(invalidPassword.error.issues[0].message, "دو رمز عبور یکسان نیستند");
  assert.equal(getWorkflowAppearance({ category: "in_progress", name: "In progress" }).label, "در حال انجام");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "jalali"), "۱۴۰۴-۰۱-۰۱");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "gregorian"), "۲۰۲۵-۰۳-۲۱");
  assert.equal(formatDuration(5400), "۱ ساعت و ۳۰ دقیقه");

  languages.push({ code: "fr", nativeName: "Français", intlLocale: "fr-FR", direction: "ltr", productName: "Heledone", messages: { Language: "Langue" } });
  useLocaleStore.getState().setLocale("fr");
  assert.equal(t("Language"), "Langue", "a registered third language works without component changes");
  assert.equal(t("تنظیمات حساب"), "Account settings", "incomplete new catalogs fall back to English");
  assert.equal(getDirection(), "ltr");
  assert.equal(t("Custom user content"), "Custom user content");
  useLocaleStore.getState().setLocale("unknown-language");
  assert.equal(useLocaleStore.getState().locale, "fa", "unsupported persisted values use the default language");
  console.log(`Localization checks passed: ${Object.keys(en.messages).length} messages, interpolation, validation, calendars, persistence, workflow labels and a third language.`);
} finally {
  await server.close();
}
