import { getLanguage, languages, t, useLocaleStore } from "../i18n/locale";

export const LanguagePicker = ({ compact = false }: { compact?: boolean }) => {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  if (compact) {
    return (
      <label className="flex items-center justify-end gap-2 text-sm text-heledone-ink-muted">
        <span>{t("Language")}</span>
        <select className="select select-sm rounded-xl bg-base-100" aria-label={t("Interface language")} value={locale} onChange={(event) => setLocale(event.target.value)}>
          {languages.map((language) => <option key={language.code} value={language.code} lang={language.code}>{language.nativeName}</option>)}
        </select>
      </label>
    );
  }

  return (
    <fieldset aria-describedby="language-help" className="space-y-4 rounded-2xl border border-heledone-border bg-base-100 p-5 sm:p-6">
      <legend className="sr-only">{t("Interface language")}</legend>
      <div>
        <h2 className="text-lg font-bold">{t("Interface language")}</h2>
        <p id="language-help" className="mt-1 text-sm text-heledone-ink-muted">{t("Choose your preferred language. Changes apply immediately.")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {languages.map((language) => (
          <label key={language.code} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${locale === language.code ? "border-primary bg-primary/5" : "border-heledone-border hover:border-primary/50"}`}>
            <input type="radio" name="interface-language" value={language.code} checked={locale === language.code} onChange={() => setLocale(language.code)} className="radio radio-primary radio-sm shrink-0" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span lang={language.code} dir={language.direction} className="text-start font-bold">{language.nativeName}</span>
              <span className="text-xs text-heledone-ink-muted">{language.direction === "rtl" ? t("Right to left") : t("Left to right")}</span>
            </span>
            {locale === language.code && <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{t("Selected")}</span>}
          </label>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{t("Current language: {language}", { language: getLanguage(locale).nativeName })}</p>
    </fieldset>
  );
};
