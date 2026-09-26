import { redirect } from "next/navigation";

/** Password and devices moved into "Профил и вход"; old links and bookmarks land on that section. */
export default function SecuritySettingsPage() {
  redirect("/app/settings#sign-in");
}
