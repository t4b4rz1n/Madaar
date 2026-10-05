import type { ReactNode } from "react";
import { Brand } from "../../../components/Brand";
import { LanguagePicker } from "../../../components/LanguagePicker";
import ThemeToggle from "../../../components/ThemeToggle";
import "../auth.css";

export const AuthLayout = ({ children, illustrated = false }: { children: ReactNode; illustrated?: boolean }) => (
  <div className="heledone-auth-page">
    <header className="heledone-auth-topbar">
      <div className="heledone-auth-topbar-inner">
        <Brand />
        <div className="heledone-auth-preferences">
          <LanguagePicker compact />
          <ThemeToggle />
        </div>
      </div>
    </header>
    <main className={`heledone-auth-content${illustrated ? " heledone-auth-content--illustrated" : ""}`}>
      {illustrated && (
        <div className="heledone-auth-background" aria-hidden="true">
          <img src="/images/heledone-assets/login-workspace-v1.png" alt="" draggable={false} decoding="async" />
        </div>
      )}
      <div className="heledone-auth-body">{children}</div>
    </main>
  </div>
);
