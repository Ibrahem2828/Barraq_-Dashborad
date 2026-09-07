/**
 * API binding switch.
 *
 * Reconnected: the Django backend now implements the AI usage/cost
 * endpoint this dashboard needs (apps/admin_dashboard/views.py:AdminAIUsageView)
 * and the HMAC-signed Django<->AI-service link is configured, so real
 * traffic is back on. API_BINDING_ENABLED / NEXT_PUBLIC_API_BINDING_ENABLED
 * in .env(.local) are still the actual on/off switch; this constant only
 * provides a fast local kill switch without touching env files.
 *
 * To pause again: set API_BINDING_FORCE_PAUSED = true below.
 */
const API_BINDING_FORCE_PAUSED = false;

export function isApiBindingEnabled(): boolean {
  // Hard pause — ignore env until this flag is flipped.
  if (API_BINDING_FORCE_PAUSED) return false;

  const publicFlag = process.env.NEXT_PUBLIC_API_BINDING_ENABLED;
  const serverFlag = process.env.API_BINDING_ENABLED;
  const value = publicFlag ?? serverFlag ?? "false";
  return value.toLowerCase() === "true";
}

const offlineAdminMe = {
  id: 0,
  email: "offline@barraq.local",
  full_name: "وضع بدون ربط",
  role: "offline",
  roles: [],
  permissions: [] as string[],
  is_superuser: true,
  is_staff: true,
  allowed_sections: {} as Record<string, boolean>
};

const offlineOverview = {
  users_count: 0,
  students_count: 0,
  admins_count: 0,
  sources_count: 0,
  collections_count: 0,
  study_plans_count: 0,
  quizzes_count: 0,
  quiz_attempts_count: 0,
  character_interactions_count: 0,
  new_users_today: 0,
  new_users_this_week: 0,
  new_sources_this_week: 0,
  subscriptions_count: 0,
  active_subscriptions_count: 0,
  free_users_count: 0,
  premium_users_count: 0,
  pro_users_count: 0,
  school_users_count: 0,
  subscriptions_by_plan: [],
  ai_jobs_count: 0,
  ai_jobs_pending_count: 0,
  ai_jobs_failed_count: 0,
  ai_jobs_completed_count: 0,
  ai_feedback_count: 0,
  ai_average_rating: null,
  notifications_count: 0,
  unread_notifications_count: 0,
  support_tickets_count: 0,
  open_support_tickets_count: 0,
  system_health: {
    database: "offline",
    cache: "offline",
    storage: "offline",
    media_root_exists: false,
    media_root_writable: false,
    static_root_exists: false,
    ai_service_enabled: false,
    app_name: "برّاق",
    app_version: "offline",
    app_phase: "disconnected",
    environment: "offline",
    debug: false,
    allowed_hosts_count: 0
  }
};

const emptyList = { count: 0, next: null, previous: null, results: [] as unknown[] };

function cleanPath(path: string): string {
  return path.replace(/^\/+/, "").split("?")[0].replace(/\/$/, "") + "/";
}

/** Offline stub payload used while binding is paused. Endpoints remain registered. */
export function offlineStubForPath(path: string, method = "GET"): { success: boolean; message: string; data: unknown } {
  const key = cleanPath(path);
  const verb = method.toUpperCase();

  if (verb !== "GET" && verb !== "HEAD") {
    return {
      success: true,
      message: "API binding paused — mutation skipped",
      data: { paused: true, path: key }
    };
  }

  if (key === "admin/me/") {
    return { success: true, message: "API binding paused", data: offlineAdminMe };
  }
  if (key === "admin/overview/") {
    return { success: true, message: "API binding paused", data: offlineOverview };
  }
  if (key === "admin/system/health/") {
    return { success: true, message: "API binding paused", data: offlineOverview.system_health };
  }
  if (key === "admin/ai-jobs/metrics/") {
    return {
      success: true,
      message: "API binding paused",
      data: {
        total: 0,
        by_status: [] as Array<{ status: string; count: number }>,
        by_character: [] as Array<{ character: string; count: number }>,
        feedback_count: 0,
        average_rating: null
      }
    };
  }
  if (key === "admin/ai-usage/") {
    return {
      success: true,
      message: "API binding paused",
      data: {
        range_days: 30,
        totals: {
          job_count: 0,
          completed_count: 0,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_usd: 0
        },
        month_to_date: { year_month: "", job_count: 0, cost_usd: 0 },
        daily: [] as Array<{ date: string; job_count: number; cost_usd: number; total_tokens: number }>,
        by_character: [] as Array<{ character: string; job_count: number; cost_usd: number; total_tokens: number }>
      }
    };
  }

  return { success: true, message: "API binding paused", data: emptyList };
}
