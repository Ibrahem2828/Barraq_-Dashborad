"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AdminMe } from "@/types/api";

interface AdminContextValue {
  admin: AdminMe | null;
  loading: boolean;
  error: string | null;
  can: (permission?: string, section?: string) => boolean;
  reload: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get<AdminMe>(endpoints.admin.me)
      .then((response) => { if (alive) { setAdmin(response.data); setError(null); } })
      .catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : "تعذر تحميل صلاحيات الحساب"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [revision]);

  const value = useMemo<AdminContextValue>(() => ({
    admin,
    loading,
    error,
    can(permission, section) {
      if (!admin) return false;
      if (admin.is_superuser) return true;
      if (permission && admin.permissions.includes(permission)) return true;
      if (section && admin.allowed_sections[section]) return true;
      return !permission && !section;
    },
    reload: () => setRevision((value) => value + 1)
  }), [admin, loading, error]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used within AdminProvider");
  return value;
}
