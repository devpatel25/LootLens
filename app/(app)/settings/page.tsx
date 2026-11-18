import type { Metadata } from "next";
import SettingsForm from "@/components/SettingsForm";
import { requirePageUserId } from "@/lib/currentUser";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

// loading.tsx is the <Suspense> boundary for this page, so the session read below streams behind it.
export default async function SettingsPage() {
  const userId = await requirePageUserId("/settings");
  const settings = await getSettings(userId);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Choose which promo codes count for you.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
