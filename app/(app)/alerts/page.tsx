import type { Metadata } from "next";
import { Suspense } from "react";
import AlertsView from "@/components/AlertsView";
import { loadAlerts, loadWatches } from "@/lib/alertsData";
import { requirePageUserId } from "@/lib/currentUser";
import { hasDemoListings } from "@/lib/wishlist";
import Loading from "./loading";

export const metadata: Metadata = { title: "Alerts" };

async function Alerts() {
  const userId = await requirePageUserId("/alerts");
  const [data, watches, anyDemo] = await Promise.all([loadAlerts(userId), loadWatches(userId), hasDemoListings(userId)]);
  return <AlertsView data={data} watches={watches} now={new Date().toISOString()} anyDemo={anyDemo} />;
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Alerts />
    </Suspense>
  );
}
