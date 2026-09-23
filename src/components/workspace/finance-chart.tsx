"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  EUR: { label: "EUR", color: "var(--primary)" },
  BGN: { label: "BGN", color: "var(--sidebar-accent)" },
} satisfies ChartConfig;

export function FinanceChart({ data, currencies }: {
  data: { month: string; EUR: number; BGN: number }[];
  currencies: string[];
}) {
  return <ChartContainer config={config} className="h-72 w-full min-w-0 aspect-auto">
    <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => new Intl.NumberFormat("bg-BG", { notation: "compact" }).format(value)} />
      <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} ${name}`} />} />
      <ChartLegend content={<ChartLegendContent />} />
      {currencies.includes("EUR") ? <Bar dataKey="EUR" fill="var(--color-EUR)" radius={[4, 4, 0, 0]} /> : null}
      {currencies.includes("BGN") ? <Bar dataKey="BGN" fill="var(--color-BGN)" radius={[4, 4, 0, 0]} /> : null}
    </BarChart>
  </ChartContainer>;
}
