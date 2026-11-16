import type { Metadata } from "next";
import { Suspense } from "react";
import CodesView from "@/components/CodesView";
import { loadCodes } from "@/lib/codes";
import { requirePageUserId } from "@/lib/currentUser";
import { getSettings } from "@/lib/settings";
import Loading from "./loading";

export const metadata: Metadata = { title: "Codes" };

async function Codes({ searchParams }: { searchParams: PageProps<"/codes">["searchParams"] }) {
  const showDead = (await searchParams).showDead === "true";
  const userId = await requirePageUserId(showDead ? "/codes?showDead=true" : "/codes");
  const [codes, settings] = await Promise.all([loadCodes(userId, { showDead }), getSettings(userId)]);
  return <CodesView codes={codes} showDead={showDead} freshnessHours={settings.freshnessHours} now={new Date().toISOString()} />;
}

export default function CodesPage({ searchParams }: PageProps<"/codes">) {
  return (
    <Suspense fallback={<Loading />}>
      <Codes searchParams={searchParams} />
    </Suspense>
  );
}
