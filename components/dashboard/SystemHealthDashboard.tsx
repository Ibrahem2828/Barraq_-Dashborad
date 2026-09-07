"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import type { SystemHealth } from "@/types/api";

export function SystemHealthDashboard() {
  const dictionary = useDictionary();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<SystemHealth>(endpoints.admin.health)
      .then((response) => {
        if (alive) {
          setHealth(response.data);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : dictionary.systemCheckFailed);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision, dictionary.systemCheckFailed]);

  const healthy =
    health && [health.database, health.cache, health.storage].every((value) => value.toLowerCase() === "healthy");

  return (
    <>
      <PageHeader
        title={dictionary.system}
        description={dictionary.systemDesc}
        actions={
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            <Icon name="refresh" />
            {dictionary.checkNow}
          </Button>
        }
      />
      {loading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : error || !health ? (
        <ErrorState message={error ?? dictionary.statusLoadFailed} onRetry={() => setRevision((value) => value + 1)} />
      ) : (
        <div className="system-layout">
          <Card className="system-hero">
            <div className="system-hero__icon">
              <Icon name="health" />
            </div>
            <div>
              <span className="eyebrow">{dictionary.platformStatus}</span>
              <h2>{healthy ? dictionary.systemsHealthy : dictionary.systemsNeedAttention}</h2>
              <p>
                {health.app_name} • {health.app_version} • {health.environment}
              </p>
            </div>
            <Badge value={healthy ? "healthy" : "degraded"} />
          </Card>
          <div className="system-cards">
            {(
              [
                { label: dictionary.database, value: health.database, detail: dictionary.databaseDetail },
                { label: "Redis / Cache", value: health.cache, detail: dictionary.cacheDetail },
                { label: dictionary.storage, value: health.storage, detail: dictionary.storageDetail },
                {
                  label: dictionary.aiService,
                  value: health.ai_service_enabled ? "active" : "inactive",
                  detail: dictionary.aiServiceDetail
                }
              ] as const
            ).map((item) => (
              <Card key={item.label} interactive className="health-card">
                <div>
                  <span className={`health-dot health-dot--${item.value.toLowerCase()}`} />
                  <h3>{item.label}</h3>
                </div>
                <Badge value={item.value} />
                <p>{item.detail}</p>
              </Card>
            ))}
          </div>
          <Card className="configuration-card">
            <header>
              <h2>{dictionary.envDetails}</h2>
              <span>{dictionary.nonSensitiveData}</span>
            </header>
            <dl>
              <div>
                <dt>{dictionary.appNameLabel}</dt>
                <dd>{health.app_name}</dd>
              </div>
              <div>
                <dt>{dictionary.versionLabel}</dt>
                <dd>{health.app_version}</dd>
              </div>
              <div>
                <dt>{dictionary.phaseLabel}</dt>
                <dd>{health.app_phase}</dd>
              </div>
              <div>
                <dt>{dictionary.environmentLabel}</dt>
                <dd>{health.environment}</dd>
              </div>
              <div>
                <dt>{dictionary.debugLabel}</dt>
                <dd>{health.debug ? dictionary.enabled : dictionary.disabled}</dd>
              </div>
              <div>
                <dt>{dictionary.allowedHosts}</dt>
                <dd>{health.allowed_hosts_count}</dd>
              </div>
              <div>
                <dt>{dictionary.mediaRoot}</dt>
                <dd>{health.media_root_exists && health.media_root_writable ? dictionary.mediaReady : dictionary.mediaNeedsAttention}</dd>
              </div>
              <div>
                <dt>{dictionary.staticRoot}</dt>
                <dd>{health.static_root_exists ? dictionary.exists : dictionary.missing}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
