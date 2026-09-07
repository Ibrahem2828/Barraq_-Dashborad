"use client";

import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useDictionary } from "@/lib/i18n/useDictionary";
import type { Locale } from "@/types/api";

export default function LoginPage() {
  const params = useParams<{ locale: Locale }>();
  const locale = params.locale === "en" ? "en" : "ar";
  const dictionary = useDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        credentials: "same-origin"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? payload.detail ?? dictionary.loginFailed);
      const next = searchParams.get("next");
      router.replace(next?.startsWith(`/${locale}`) ? next : `/${locale}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : dictionary.loginFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden={false}>
        <div className="login-visual__glow" aria-hidden="true" />
        <div className="login-visual__glow login-visual__glow--secondary" aria-hidden="true" />

        <div className="login-brand">
          <div className="login-brand__mark">
            <Image src="/brand/logo-light-removebg-preview.png" width={120} height={120} alt={dictionary.brandName} priority />
          </div>
          <div>
            <strong>{dictionary.brandName}</strong>
            <span>{dictionary.brandTagline}</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">{dictionary.loginEyebrow}</span>
          <h1>
            {dictionary.loginHeadlineLine1}
            <br />
            {dictionary.loginHeadlineLine2}
          </h1>
          <p>{dictionary.loginVisualDesc}</p>
        </div>

        <div className="login-visual__footer">
          <div className="login-gems" aria-hidden="true">
            <span className="gem gem--purple" />
            <span className="gem gem--green" />
            <span className="gem gem--blue" />
            <span className="gem gem--red" />
            <span className="gem gem--pink" />
          </div>
          <p className="login-visual__note">{dictionary.loginVisualNote}</p>
        </div>
      </section>

      <section className="login-panel">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          aria-label={dictionary.toggleTheme}
          title={theme === "dark" ? dictionary.lightMode : dictionary.darkMode}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>

        <form className="login-form" onSubmit={submit} noValidate={false}>
          <div className="login-form__shine" aria-hidden="true" />

          <div className="login-form__header">
            <div className="login-form__logo">
              <Image src="/brand/logo-light-removebg-preview.png" width={72} height={72} alt="" />
            </div>
            <div>
              <span>{dictionary.welcomeBack}</span>
              <h2>{dictionary.login}</h2>
              <p>{dictionary.loginFormHint}</p>
            </div>
          </div>

          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="login-field">
            <span>{dictionary.email}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="admin@baraq.app"
            />
          </label>

          <label className="login-field">
            <span>{dictionary.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="••••••••••••"
            />
          </label>

          <Button type="submit" disabled={busy} aria-busy={busy} className="login-form__submit">
            {busy ? dictionary.signingIn : dictionary.signIn}
          </Button>

          <div className="login-security" aria-label={dictionary.securityFeatures}>
            <span>{dictionary.secureConnection}</span>
            <span>{dictionary.httpOnlySession}</span>
            <span>{dictionary.rbacAccess}</span>
          </div>
        </form>
      </section>
    </main>
  );
}
