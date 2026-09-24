"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  EUR: { label: "EUR", color: "var(--primary)" },
} satisfies ChartConfig;

export function FinanceChart({ data }: { data: { month: string; EUR: number }[] }) {
  return <ChartContainer config={config} className="aspect-auto h-56 w-full min-w-0">
    <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => new Intl.NumberFormat("bg-BG", { notation: "compact" }).format(value)} />
      <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} EUR`} />} />
      <Bar dataKey="EUR" fill="var(--color-EUR)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ChartContainer>;
}
