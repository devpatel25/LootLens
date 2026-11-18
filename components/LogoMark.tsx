/** The LootLens mark: a lens on an emerald tile. Decorative, so it never changes a link's name. */
export default function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className={className}>
      <rect width="28" height="28" rx="7" className="fill-emerald-700" />
      <circle cx="12.5" cy="12.5" r="5.5" fill="none" stroke="white" strokeWidth="2.2" />
      <path d="m16.6 16.6 4.4 4.4" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
