const statusTone: Record<string, string> = {
  active: "success",
  completed: "success",
  healthy: "success",
  resolved: "success",
  ready: "success",
  pending: "warning",
  created: "warning",
  queued: "warning",
  submitted: "info",
  processing: "info",
  validating: "info",
  open: "warning",
  in_progress: "info",
  failed: "danger",
  error: "danger",
  closed: "neutral",
  canceled: "neutral",
  inactive: "neutral",
  suspended: "danger",
  degraded: "warning"
};

export function Badge({ value, label }: { value?: unknown; label?: string }) {
  const text = label ?? String(value ?? "—");
  const tone = statusTone[String(value ?? "").toLowerCase()] ?? "neutral";
  return (
    <span className={`badge badge--${tone}`} title={text}>
      {text}
    </span>
  );
}
