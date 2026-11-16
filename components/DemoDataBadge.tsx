import { chip } from "@/components/styles";

/** Shown on every screen that displays seeded, simulated, or fixture data (AGENTS.md section 3). */
export default function DemoDataBadge() {
  return (
    <span className={`${chip} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100`}>
      Demo data
    </span>
  );
}
