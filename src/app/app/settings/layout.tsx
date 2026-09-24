import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await requireTenantContext();
  return (
    <PageShell>
      <PageHeader page="settings" />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <SettingsNav owner={context.role === "owner"} />
        <div className="flex min-w-0 max-w-3xl flex-col gap-6">{children}</div>
      </div>
    </PageShell>
  );
}
