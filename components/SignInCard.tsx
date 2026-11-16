export type SignInCardProps = {
  action: (formData: FormData) => void | Promise<void>;
  callbackUrl: string;
  error: string | null;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

export default function SignInCard({ action, callbackUrl, error }: SignInCardProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div aria-hidden="true" className="mb-6 grid size-10 place-items-center rounded-xl bg-emerald-700 text-lg font-bold text-white">
        L
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Sign in to LootLens</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Track prices and live promo codes for the things you want, in one place.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
        >
          {error}
        </p>
      )}
      <form action={action} className="mt-6">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">No password. No marketing email.</p>
    </div>
  );
}
