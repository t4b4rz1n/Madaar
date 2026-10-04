import { useTranslation } from "../../../i18n/locale";
import type { ReactNode } from "react";
import { Brand, BrandWave } from "../../../components/Brand";
import { LanguagePicker } from "../../../components/LanguagePicker";

export const AuthLayout = ({ children }: { children: ReactNode }) => { const t = useTranslation(); return (
  <div className="heledone-auth">
    <aside className="heledone-auth-story">
      <Brand />
      <div>
        <p className="mb-4 text-sm font-semibold">{t("یک تیم، یک ریتم مشترک")}</p>
        <h2>{t("کارها که هماهنگ شوند،")}<br />{t("تیم جان می‌گیرد.")}</h2>
        <p className="mt-5 text-base leading-relaxed">{t("از اولین ایده تا آخرین قدم، کنار هم پیش بروید. هله‌دان خانه‌ای برای پروژه‌ها، کارهای تیم و وقت ارزشمند شماست.")}</p>
        <div className="heledone-auth-frame" aria-hidden="true">
          <img src="/images/heledone-assets/coastal-welcome.png" alt="" className="h-full w-full object-cover object-left" />
        </div>
        <div className="mt-5 max-w-lg"><BrandWave /></div>
      </div>
      <p className="text-sm">{t("با گرمای جنوب، با ریتم تیم شما.")}</p>
    </aside>
    <main className="heledone-auth-form">
      <div className="w-full max-w-md">
        <div className="heledone-auth-mobile-brand"><Brand /></div>
        <div className="mb-6"><LanguagePicker compact /></div>
        {children}
        <p className="mt-8 text-center text-sm text-heledone-ink-muted">{t("هله‌دان · همراه کارهای تیم")}</p>
      </div>
    </main>
  </div>
); };
