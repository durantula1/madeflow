import Link from "next/link";
import { CheckCircle2, MessageSquareText } from "lucide-react";
export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ token }, { status }] = await Promise.all([params, searchParams]);
  const approved = status === "approved";
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${approved ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
        >
          {approved ? <CheckCircle2 /> : <MessageSquareText />}
        </span>
        <h1 className="mt-5 text-2xl font-semibold">
          {approved ? "Версията е одобрена" : "Съобщението е изпратено"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {approved
            ? "Одобрението и цифровият отпечатък са записани. Екипът може да продължи към производство."
            : "Екипът получи обратната връзка и ще продължи работата по поръчката."}
        </p>
        <Link
          href={`/p/${token}`}
          className="mt-6 inline-block text-sm font-semibold text-primary"
        >
          Обратно към поръчката
        </Link>
      </div>
    </main>
  );
}
