import type { Metadata } from "next";
import { Suspense } from "react";
import LoadingState from "@/components/LoadingState";
import SettingsForm from "@/components/SettingsForm";
import { requirePageUserId } from "@/lib/currentUser";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

async function SettingsContent() {
  const userId = await requirePageUserId();
  return <SettingsForm settings={await getSettings(userId)} />;
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Choose which promo codes count for you.</p>
      </div>
      <Suspense fallback={<LoadingState label="Loading settings" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
