import type { Metadata } from "next";
import { Suspense } from "react";
import AlertsView from "@/components/AlertsView";
import LoadingState from "@/components/LoadingState";
import { loadAlerts, loadWatches } from "@/lib/alertsData";
import { requirePageUserId } from "@/lib/currentUser";
import { hasDemoListings } from "@/lib/wishlist";

export const metadata: Metadata = { title: "Alerts" };

async function Alerts() {
  const userId = await requirePageUserId();
  const [data, watches, anyDemo] = await Promise.all([loadAlerts(userId), loadWatches(userId), hasDemoListings(userId)]);
  return <AlertsView data={data} watches={watches} now={new Date().toISOString()} anyDemo={anyDemo} />;
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading alerts" />}>
      <Alerts />
    </Suspense>
  );
}
