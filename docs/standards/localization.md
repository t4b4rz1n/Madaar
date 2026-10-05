# Interface localization

Heledone ships with Persian (`fa`, RTL) and English (`en`, LTR). Members can choose a language in **Workspace Settings → Interface language**, independently of administration permissions. The sign-in and registration screens also offer the same preference.

The preference is stored in this browser under `heledone.language`, restored before the initial render, and synchronized between tabs. It does not currently sync through a user profile or across devices. Unsupported stored codes use Persian. Language changes update the document's `lang`, `dir` and title, as well as toast placement and directional navigation/sheet motion. Components subscribe to the locale without remounting, so editing state is preserved.

## Adding a language

1. Copy `apps/web/src/i18n/locales/en.ts` into a new catalog and translate its values. Keep the source-message keys and interpolation placeholders unchanged.
2. Register the catalog in `languages` in `apps/web/src/i18n/locale.ts`, supplying `code`, `nativeName`, `intlLocale`, `direction`, `productName` and `messages`.
3. The settings and authentication selectors will include the new language automatically. Missing messages fall back to English. Choose an Intl locale supported by the target browsers.
4. Run `npm --prefix apps/web run test:i18n`, `npm run web:lint` and `npm run web:build`, then verify the new direction and long labels in the browser.

## Writing localized UI

Use `const t = useTranslation()` inside React components and `t` from the locale module in non-React helpers or validation callbacks. Catalog keys are stable source messages; they may be Persian or English. Add every new source key to both built-in catalogs. Translate a full sentence, with named interpolation parameters, rather than joining translated fragments around dynamic data. For example:

```tsx
const t = useTranslation();
return <p>{t("Open {section}", { section: section.title })}</p>;
```

Static label collections use deferred getters so they do not capture the language at module initialization. Include `t` in memo/effect dependencies when a callback uses it. Zod messages use error callbacks so an existing schema validates in the current language.

Project names, custom column names, member names, task descriptions and comments are user content and must be preserved. Only recognized built-in workflow labels are localized. Never translate API enums, IDs, permission codes, route paths or query keys. Use logical CSS properties (`start`, `end`, `ps`, `pe`, `text-start`) for interface layout. All headings, labels, table cells and form fields follow the selected UI direction: right aligned in Persian and left aligned in English. Do not force `dir="auto"` or `dir="ltr"` on input fields or content containers. The Latin brand wordmark is an isolated exception. Password toggles and input icons use logical positions and padding.

Language and calendar are independent: `formatDisplayDate` uses the account's existing Gregorian/Jalali preference and Intl for localized names and digits. The shared API client sends the selected code in `Accept-Language`; changing languages invalidates cached queries so server-provided labels refresh. Keep machine-readable dates, amounts and request values unchanged. Use `formatNumber`, `formatDuration` and `formatRelativeTime` for display values, and `normalizeNumericInput` to accept Persian/Arabic digits while keeping numeric form submissions ASCII. Use `getErrorMessage` to prefer localized API errors over Axios transport messages. Server catalogs live in `apps/api/locale`; compile updated catalogs with `python manage.py compilemessages` and restart long-running workers to load them.

The localization check verifies catalog coverage and placeholders, untranslated JSX/accessibility labels, direction overrides, Persian text leaking into English catalogs, numeric keyboard input, localized errors, persisted preferences, English fallback for a third language, reused form validation schemas, date formatting in both calendars, and preservation of custom status names. Browser QA covers the 17 main workspace pages in both languages, rendered heading/form/table alignment, and profile fields at a 390px mobile width. Language and calendar preferences remain independent.
