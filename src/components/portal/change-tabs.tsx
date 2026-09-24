"use client";

import { useState } from "react";
import type { Key } from "react-aria-components";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Client portal document view: details (with history) and decision tabs beside a sticky summary. */
export function PortalChangeTabs({ details, decision, history, summary, pending, questions, unreadAnswers = 0 }: {
  details: React.ReactNode;
  decision: React.ReactNode;
  history: React.ReactNode;
  summary: React.ReactNode;
  pending: boolean;
  questions?: React.ReactNode;
  unreadAnswers?: number;
}) {
  const [tab, setTab] = useState<Key>(unreadAnswers ? "questions" : "details");
  const toDecision = (
    <Button className="h-11 w-full text-base" onPress={() => { setTab("decision"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
      Към решението <ArrowRight />
    </Button>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Tabs selectedKey={tab} onSelectionChange={setTab} className="min-w-0">
        <TabsList aria-label="Раздели на документа">
          <TabsTrigger id="details">Детайли</TabsTrigger>
          <TabsTrigger id="decision">
            Решение
            {pending ? <span aria-label="очаква решение" className="size-2 rounded-full bg-primary in-data-selected:bg-primary-foreground" /> : null}
          </TabsTrigger>
          {questions ? (
            <TabsTrigger id="questions">
              Въпроси
              {unreadAnswers ? <span aria-label={`${unreadAnswers} нов отговор`} className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground in-data-selected:bg-primary-foreground in-data-selected:text-primary">{unreadAnswers}</span> : null}
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent id="details" className="flex flex-col gap-5 pt-3">
          {details}
          {pending ? <div className="lg:hidden">{toDecision}</div> : null}
          {history}
        </TabsContent>
        <TabsContent id="decision" className="pt-3">{decision}</TabsContent>
        {questions ? <TabsContent id="questions" className="pt-3">{questions}</TabsContent> : null}
      </Tabs>
      <aside className="order-first flex flex-col gap-3 lg:sticky lg:top-6 lg:order-none lg:mt-[3.75rem]">
        {summary}
        {pending && tab !== "decision" ? <div className="hidden lg:block">{toDecision}</div> : null}
      </aside>
    </div>
  );
}
