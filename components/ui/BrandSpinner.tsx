"use client";

import { useDictionary } from "@/lib/i18n/useDictionary";

type BrandSpinnerSize = "sm" | "md" | "lg";

/** Lightweight Baraq loader — plain img, no next/image, no priority (safe during route transitions). */
export function BrandSpinner({
  size = "md",
  label
}: {
  size?: BrandSpinnerSize;
  label?: string;
}) {
  const dictionary = useDictionary();

  return (
    <div className={`brand-spinner brand-spinner--${size}`} role="status" aria-live="polite" aria-busy="true">
      <div className="brand-spinner__ring" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-light-removebg-preview.png"
          alt=""
          className="brand-spinner__logo"
          width={size === "lg" ? 72 : size === "md" ? 56 : 36}
          height={size === "lg" ? 72 : size === "md" ? 56 : 36}
          decoding="async"
        />
      </div>
      {label ? <p className="brand-spinner__label">{label}</p> : <span className="sr-only">{dictionary.loading}</span>}
    </div>
  );
}

export function BrandLoadingScreen({ message }: { message?: string }) {
  const dictionary = useDictionary();

  return (
    <div className="brand-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="brand-loading-screen__smoke" aria-hidden="true">
        <span className="brand-loading-screen__smoke-orb brand-loading-screen__smoke-orb--purple" />
        <span className="brand-loading-screen__smoke-orb brand-loading-screen__smoke-orb--blue" />
        <span className="brand-loading-screen__smoke-orb brand-loading-screen__smoke-orb--pink" />
        <span className="brand-loading-screen__smoke-orb brand-loading-screen__smoke-orb--gold" />
      </div>
      <div className="brand-loading-screen__mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-light-removebg-preview.png"
          alt=""
          className="brand-loading-screen__logo"
          width="168"
          height="96"
          decoding="async"
        />
        <strong className="brand-loading-screen__name">{dictionary.brandName}</strong>
        <p>{message ?? dictionary.preparingDashboard}</p>
        <div className="brand-loading-screen__bar" aria-hidden="true" />
      </div>
    </div>
  );
}
