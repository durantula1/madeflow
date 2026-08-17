import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]"><section className="flex flex-col px-5 py-6 sm:px-10"><Wordmark /><div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">{children}</div></section><aside className="surface-grid relative hidden overflow-hidden bg-[#24261f] p-12 text-stone-50 lg:flex lg:flex-col lg:justify-end"><div className="absolute left-12 top-12 text-sm font-medium text-[#8ac99a]">MadeFlow / beta</div><blockquote className="relative max-w-2xl text-balance text-4xl font-medium leading-tight tracking-tight">„Вече не питаме коя версия е последна. Всички гледаме една и съща поръчка.“</blockquote><p className="relative mt-6 text-stone-400">Единен паспорт за екипа и клиента.</p></aside></main>;
}
