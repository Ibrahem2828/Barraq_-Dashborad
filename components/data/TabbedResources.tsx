"use client";

import { useState } from "react";
import { ResourcePage, type Column, type FilterConfig } from "@/components/data/ResourcePage";
import { Tabs } from "@/components/ui/Tabs";

export interface ResourceTab {
  id: string;
  label: string;
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
  filters?: FilterConfig[];
  defaultOrdering?: string;
}

export function TabbedResources({ tabs }: { tabs: ResourceTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!selected) return null;
  return <div className="tabbed-page"><Tabs items={tabs.map((tab) => ({ id: tab.id, label: tab.label }))} value={active} onChange={setActive}/><ResourcePage title={selected.title} description={selected.description} endpoint={selected.endpoint} columns={selected.columns} filters={selected.filters} defaultOrdering={selected.defaultOrdering}/></div>;
}
