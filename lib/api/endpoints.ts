export const endpoints = {
  admin: {
    me: "admin/me/",
    overview: "admin/overview/",
    aiUsage: "admin/ai-usage/",
    health: "admin/system/health/",
    users: "admin/users/",
    admins: "admin/admin-users/",
    roles: "admin/roles/",
    permissions: "admin/permissions/",
    educationStages: "admin/education-stages/",
    subjects: "admin/subjects/",
    sources: "admin/sources/",
    sourceCollections: "admin/source-collections/",
    studyPlans: "admin/study-plans/",
    quizzes: "admin/quizzes/",
    quizAttempts: "admin/quiz-attempts/",
    characterInteractions: "admin/character-interactions/",
    auditLogs: "admin/audit-logs/",
    aiJobs: "admin/ai-jobs/",
    aiJobMetrics: "admin/ai-jobs/metrics/",
    aiFeedback: "admin/ai-feedback/",
    aiWebhookEvents: "admin/ai-webhook-events/",
    aiRecommendations: "admin/ai-recommendations/",
    aiSummaries: "admin/ai-summaries/",
    aiTranscriptions: "admin/ai-transcriptions/",
    supportTickets: "admin/support-tickets/",
    subscriptionPlans: "admin/subscription-plans/",
    userSubscriptions: "admin/user-subscriptions/",
    subscriptionUsage: "admin/subscription-usage/"
  }
} as const;

export function detailEndpoint(base: string, id: string | number): string {
  return `${base}${id}/`;
}
