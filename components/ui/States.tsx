"use client";

import { BrandSpinner } from "@/components/ui/BrandSpinner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useDictionary } from "@/lib/i18n/useDictionary";

export function LoadingState({ size = "md" }: { size?: "sm" | "md" | "lg"; rows?: number }) {
  const dictionary = useDictionary();

  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true" aria-label={dictionary.loading}>
      <BrandSpinner size={size} label={dictionary.loading} />
    </div>
  );
}

export function EmptyState({ title, description }: { title?: string; description?: string }) {
  const dictionary = useDictionary();

  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        <Icon name="file" />
      </div>
      <h3>{title ?? dictionary.emptyTitle}</h3>
      <p>{description ?? dictionary.emptyDescription}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const dictionary = useDictionary();

  return (
    <div className="error-state" role="alert">
      <div className="error-state__icon" aria-hidden="true">
        <Icon name="close" />
      </div>
      <div>
        <h3>{dictionary.loadFailed}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <Icon name="refresh" />
          {dictionary.retry}
        </Button>
      ) : null}
    </div>
  );
}
