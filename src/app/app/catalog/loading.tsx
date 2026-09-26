import { CatalogManagerSkeleton } from "@/components/catalog/catalog-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

/** Same header and tabs as the page; the default "Услуги и материали" tab shows the list placeholder. */
export default function CatalogLoading() {
  return (
    <PageShell loading>
      <PageHeader page="catalog" />
      <Tabs defaultSelectedKey="items">
        <TabsList>
          <TabsTrigger id="items">Услуги и материали</TabsTrigger>
          <TabsTrigger id="templates">Шаблони</TabsTrigger>
        </TabsList>
        <TabsContent id="items" className="pt-5">
          <CatalogManagerSkeleton />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
