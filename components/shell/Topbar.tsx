"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/providers/AdminProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Icon } from "@/components/ui/Icon";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

function readCookie(name: string) {
  const part = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.split("=").slice(1).join("=")) : "";
}

export function Topbar({
  locale,
  dictionary,
  onMenu
}: {
  locale: Locale;
  dictionary: Dictionary;
  onMenu: () => void;
}) {
  const router = useRouter();
  const { admin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const [busy, setBusy] = useState(false);

  const switchLocale = () => {
    const current = window.location.pathname;
    const nextLocale = locale === "ar" ? "en" : "ar";
    const nextPath = current.replace(/^\/(ar|en)(?=\/|$)/, `/${nextLocale}`);
    document.cookie = `baraq_locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    window.location.assign(nextPath);
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": readCookie("baraq_csrf") },
        credentials: "same-origin"
      });
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
      setBusy(false);
    }
  };

  const displayName = admin?.full_name ?? dictionary.adminFallback;
  const initial = displayName.slice(0, 1);
  const roleLabel = admin?.role || (admin?.is_superuser ? "Super Admin" : "Admin");

  return (
    <header className="topbar">
      <div className="topbar__bar" aria-hidden="true" />

      <div className="topbar__start">
        <button type="button" className="icon-button topbar__menu" onClick={onMenu} aria-label={dictionary.menu}>
          <Icon name="menu" />
        </button>

        <label className="topbar__search">
          <span className="topbar__search-icon" aria-hidden="true">
            <Icon name="search" />
          </span>
          <input type="search" placeholder={dictionary.search} aria-label={dictionary.search} />
          <kbd className="topbar__search-kbd">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </label>
      </div>

      <div className="topbar__end">
        <div className="topbar__tools" role="group" aria-label={dictionary.quickTools}>
          <button
            type="button"
            className="topbar__tool topbar__tool--lang"
            onClick={switchLocale}
            aria-label={locale === "ar" ? dictionary.switchToEnglish : dictionary.switchToArabic}
            title={locale === "ar" ? "English" : "العربية"}
          >
            <span className="topbar__tool-label">{locale === "ar" ? "EN" : "ع"}</span>
          </button>

          <button
            type="button"
            className="topbar__tool"
            onClick={toggleTheme}
            aria-label={dictionary.toggleTheme}
            title={theme === "dark" ? dictionary.lightMode : dictionary.darkMode}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>

          <button
            type="button"
            className="topbar__tool notification-button"
            aria-label={dictionary.notifications}
            title={dictionary.notifications}
          >
            <Icon name="bell" />
            <span className="notification-button__dot" aria-hidden="true" />
          </button>
        </div>

        <div className="topbar__user">
          <div className="topbar__identity" title={admin?.email ?? displayName}>
            <span className="avatar topbar__avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="topbar__identity-text">
              <strong>{displayName}</strong>
              <small>
                <span className="topbar__role">{roleLabel}</span>
                {admin?.email ? <span className="topbar__email">{admin.email}</span> : null}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="topbar__logout"
            onClick={logout}
            disabled={busy}
            aria-busy={busy}
            title={dictionary.logout}
          >
            <Icon name="logout" />
            <span>{dictionary.logout}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
