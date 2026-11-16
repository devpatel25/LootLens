import type { Metadata } from "next";
import { Suspense } from "react";
import CodesView from "@/components/CodesView";
import LoadingState from "@/components/LoadingState";
import { loadCodes } from "@/lib/codes";
import { requirePageUserId } from "@/lib/currentUser";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Codes" };

async function Codes({ searchParams }: { searchParams: PageProps<"/codes">["searchParams"] }) {
  const userId = await requirePageUserId();
  const showDead = (await searchParams).showDead === "true";
  const [codes, settings] = await Promise.all([loadCodes(userId, { showDead }), getSettings(userId)]);
  return <CodesView key={String(showDead)} codes={codes} showDead={showDead} freshnessHours={settings.freshnessHours} now={new Date().toISOString()} />;
}

export default function CodesPage({ searchParams }: PageProps<"/codes">) {
  return (
    <Suspense fallback={<LoadingState label="Loading codes" />}>
      <Codes searchParams={searchParams} />
    </Suspense>
  );
}
