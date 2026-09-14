export const endpoints = {
  admin: {
    me: "admin/me/",
    overview: "admin/overview/",
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
    aiUsage: "admin/ai-usage/",
    supportTickets: "admin/support-tickets/",
    subscriptionPlans: "admin/subscription-plans/",
    userSubscriptions: "admin/user-subscriptions/",
    subscriptionUsage: "admin/subscription-usage/"
  },
  ai: {
    serviceHealth: "ai/service-health/"
  },
  auth: {
    changePassword: "auth/change-password/",
    passwordReset: "auth/password-reset/",
    passwordResetConfirm: "auth/password-reset/confirm/",
    verify: "auth/verify/"
  }
} as const;

export function detailEndpoint(base: string, id: string | number): string {
  return `${base}${id}/`;
}

export function userActionEndpoint(
  userId: string | number,
  action: "activate" | "suspend" | "cancel-subscription" | "change-subscription"
): string {
  return `${endpoints.admin.users}${userId}/${action}/`;
}

export function adminAssignRolesEndpoint(adminId: string | number): string {
  return `${endpoints.admin.admins}${adminId}/assign-roles/`;
}

export function supportTicketMessagesEndpoint(ticketId: string | number): string {
  return `${endpoints.admin.supportTickets}${ticketId}/messages/`;
}

export function aiJobCancelEndpoint(publicId: string | number): string {
  return `${endpoints.admin.aiJobs}${publicId}/cancel/`;
}
