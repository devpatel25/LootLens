/**
 * The unread count on the Alerts tab. The number is hidden from screen readers; the link is described by
 * "3 unread alerts" instead (describedById), so its name stays "Alerts". Nothing renders at zero.
 */
export default function AlertsBadge({ count, describedById }: { count: number; describedById: string }) {
  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-0.5 right-1/4 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-xs font-bold leading-5 text-white md:static md:ml-auto"
      >
        {count > 99 ? "99+" : count}
      </span>
      {/* aria-hidden keeps this out of the link's name; aria-describedby still reads it as the description. */}
      <span id={describedById} aria-hidden="true" className="sr-only">
        {count === 1 ? "1 unread alert" : `${count} unread alerts`}
      </span>
    </>
  );
}
