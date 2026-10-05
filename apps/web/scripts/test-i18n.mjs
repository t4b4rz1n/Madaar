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
const server = await createServer({ configFile: false, root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom" });
try {
  const { languages, useLocaleStore, t, getDirection, formatNumber, normalizeNumericInput } = await server.ssrLoadModule("/src/i18n/locale.ts");
  const { getErrorMessage } = await server.ssrLoadModule("/src/core/utils/errorHandler.ts");
  const { formatDisplayDate } = await server.ssrLoadModule("/src/utils/date.ts");
  const { formatDuration } = await server.ssrLoadModule("/src/i18n/formatters.ts");
  const { getWorkflowAppearance } = await server.ssrLoadModule("/src/core/config/designTokens.ts");
  const { formatNotificationMessage } = await server.ssrLoadModule("/src/features/notifications/utils/messages.ts");
  const { notificationSchema } = await server.ssrLoadModule("/src/features/notifications/validation/notificationSchema.ts");
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
    assert.ok(!/[\u0600-\u06ff]/.test(en.messages[key]), `Persian leaked into English UI message: ${key}`);
  }

  const missing = [];
  async function checkSource(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { if (!["mocks", "i18n"].includes(entry.name)) await checkSource(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isCallExpression(node) && ["t", "translate", "translateError"].includes(node.expression.getText(source)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text;
          if (!Object.hasOwn(en.messages, key)) missing.push(`${path.relative(root, file)}: ${key}`);
        }
        if (ts.isJsxText(node) && /[A-Za-z\u0600-\u06ff]{2}/.test(node.text)) missing.push(`${path.relative(root, file)}: untranslated JSX text ${node.text.trim()}`);
        if (ts.isJsxAttribute(node) && ["placeholder", "aria-label", "title", "alt"].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer) && /[A-Za-z\u0600-\u06ff]{2}/.test(node.initializer.text) && !/^https?:\/\//.test(node.initializer.text)) missing.push(`${path.relative(root, file)}: untranslated ${node.name.getText(source)}`);
        if (ts.isJsxAttribute(node) && node.name.getText(source) === "dir" && node.initializer && ts.isStringLiteral(node.initializer) && ["ltr", "auto"].includes(node.initializer.text) && !file.endsWith("Brand.tsx")) missing.push(`${path.relative(root, file)}: direction must follow the selected UI language`);
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
  assert.equal(normalizeNumericInput("۱٬۲۳۴٫۵"), "1234.5");
  assert.equal(normalizeNumericInput("١٬٢٣٤٫٥"), "1234.5");
  assert.equal(normalizeNumericInput("1,234.5"), "1234.5");
  const nowruz = new Date("2025-03-21T12:00:00Z");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "jalali"), "1404-01-01");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "gregorian"), "2025-03-21");
  assert.equal(formatDuration(5400), "1h 30m");
  const assigned = { text: "A new task has been assigned to you! Task: API {v2} By: Sara" };
  assert.equal(formatNotificationMessage(assigned), "Sara assigned you API {v2}. You've got this!");
  const longTitle = "طرح فارسی API {v2} ".repeat(30);
  const structuredNotification = { text: "truncated message", message_data: { event: "task_created", values: { task_title: longTitle, project_name: "Launch" } } };
  assert.equal(formatNotificationMessage(structuredNotification), `A new task, ${longTitle}, is ready in Launch. Let's get going!`, "structured data preserves full user content, including braces and long names");
  assert.equal(formatNotificationMessage({ text: "نسخه جدید پنل مدیریت آماده بررسی است." }), "The new admin panel is ready. Come take a look!");
  assert.ok(!/[\u0600-\u06ff]/.test(formatNotificationMessage({ text: "", message_data: { event: "leave_requested", values: { user_name: "Sara", leave_type: "استعلاجی" } } })), "request types follow the UI language even when the event originated in Persian");
  assert.equal(notificationSchema.safeParse({ text: " " }).success, false);
  assert.equal(notificationSchema.safeParse({ text: "a".repeat(256) }).success, false, "notification length matches the API");

  useLocaleStore.getState().setLocale("fa");
  assert.equal(storage.get("heledone.language"), "fa", "persist a changed preference");
  assert.equal(getDirection(), "rtl");
  assert.equal(await requestLanguage(), "fa", "the API preference follows language changes without rebuilding the client");
  assert.equal(t("Interface language"), "زبان رابط");
  assert.equal(loginSchema.safeParse({ username: "", password: "" }).error.issues[0].message, "نام کاربریت رو بنویس", "reused schemas must follow the active language");
  const invalidPassword = registerSchema.safeParse({ username: "sara", email: "sara@example.com", password: "Abc12345", password_confirm: "different" });
  assert.equal(invalidPassword.error.issues[0].message, "دو تا رمز با هم یکی نیستن");
  assert.equal(getWorkflowAppearance({ category: "in_progress", name: "In progress" }).label, "در حال انجام");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "jalali"), "۱۴۰۴-۰۱-۰۱");
  assert.equal(formatDisplayDate(nowruz, "yyyy-MM-dd", "gregorian"), "۲۰۲۵-۰۳-۲۱");
  assert.equal(formatDuration(5400), "۱ ساعت و ۳۰ دقیقه");
  assert.equal(t("{count} projects in total", { count: 3 }), "در مجموع ۳ پروژه");
  assert.equal(t("Ideal Line"), "روند ایده‌آل");
  assert.equal(formatNotificationMessage(assigned), "Sara تسک API {v2} رو بهت سپرد. از پسش برمیای!", "cached notifications change language immediately");
  assert.ok(formatNotificationMessage(structuredNotification).includes(longTitle));
  assert.equal(formatNotificationMessage({ text: "Task completed! Task Login has been successfully completed." }), "تسک Login انجام شد. خسته نباشی!");
  assert.equal(formatNotificationMessage({ text: "Leave request result Your leave request has been reviewed. Status: Approved" }), "درخواست مرخصیت بررسی شد. نتیجه‌اش: تأیید شده.");
  assert.equal(formatNotificationMessage({ text: "My custom broadcast: API {v2}" }), "My custom broadcast: API {v2}", "authored messages are not interpreted as catalog keys");
  assert.equal(formatNotificationMessage({ text: "Keep this", message_data: { event: "future_event", values: {} } }), "Keep this", "unknown events keep their original message");
  assert.equal(notificationSchema.safeParse({ text: "a".repeat(256) }).error.issues[0].message, "پیامت رو در ۲۵۵ کاراکتر جا بده");
  assert.equal(t("Running"), "در حال اجرا");
  assert.equal(getErrorMessage({ message: "Request failed with status code 400", response: { data: { message: "Failed to create team" } } }, "Fallback"), "نتونستیم تیم رو بسازیم. دوباره امتحان کن.", "prefer translated backend errors over Axios transport messages");
  assert.equal(getErrorMessage({ message: "Network Error" }, "Fallback"), "ارتباط با سرور قطع شد. اینترنتت رو چک کن و دوباره امتحان کن.");
  assert.equal(getErrorMessage({}, "Could not complete action."), "این کار انجام نشد. دوباره امتحان کن.");
  assert.equal(getErrorMessage("Request failed with status code 500"), "این کار انجام نشد. دوباره امتحان کن.");

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
