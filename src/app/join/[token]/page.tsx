import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { acceptTeamInviteAction } from "@/modules/team/actions";
import { getTeamInvite } from "@/modules/team/queries";

export default async function JoinTeamPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const invite = await getTeamInvite(hashPortalToken(token));
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-semibold">Поканата не е активна</h1></main>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = `/join/${token}`;
  if (!user) return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-semibold">Покана за екипа</h1><p>Поканата е за {invite.email}. Влез или се регистрирай с този имейл.</p><Link className="font-semibold text-primary" href={`/sign-in?next=${encodeURIComponent(next)}`}>Вход</Link><br /><Link className="font-semibold text-primary" href={`/sign-up?next=${encodeURIComponent(next)}`}>Регистрация</Link></main>;
  if (user.email?.toLowerCase() !== invite.email) return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-semibold">Друг имейл</h1><p className="mt-3">Влез с {invite.email}, за да приемеш поканата.</p></main>;
  return <main className="mx-auto max-w-lg space-y-5 p-8"><h1 className="text-2xl font-semibold">Присъедини се към екипа</h1><p>Роля: {invite.role === "owner" ? "Owner" : invite.role === "office" ? "Офис" : "Терен"}</p><form action={acceptTeamInviteAction}><input type="hidden" name="token" value={token} /><button className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Приеми поканата</button></form></main>;
}
