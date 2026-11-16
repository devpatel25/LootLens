"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ApiClientError, apiFetch, friendlyMessage } from "@/lib/apiClient";
import {
  CATEGORIES,
  EMPTY_FORM,
  formValuesFromItem,
  parseSizes,
  toItemBody,
  type ItemFormErrors,
  type ItemFormValues,
} from "@/lib/itemForm";
import type { Item } from "@/lib/types";
import { useModalDialog } from "@/lib/useModalDialog";

export type ItemSheetProps = {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSaved: (name: string) => void;
  /** The item was deleted elsewhere (404). */
  onMissing: () => void;
};

export default function ItemSheet(props: ItemSheetProps) {
  return props.open ? <OpenItemSheet {...props} /> : null;
}

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 aria-[invalid=true]:border-red-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:aria-[invalid=true]:border-red-400";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-zinc-600 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-800 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

const FIELD_ORDER: (keyof ItemFormValues)[] = ["name", "category", "sizes", "selectedSize", "typicalPrice", "sourceUrl"];

function OpenItemSheet({ item, onClose, onSaved, onMissing }: ItemSheetProps) {
  const [busy, setBusy] = useState(false);
  // While a save is in flight, Escape and Cancel do nothing, so a late reply cannot act on a closed sheet.
  const ref = useModalDialog(() => {
    if (!busy) onClose();
  });
  const uid = useId();
  const id = (f: keyof ItemFormValues) => `${uid}-${f}`;
  const [values, setValues] = useState<ItemFormValues>(item ? formValuesFromItem(item) : EMPTY_FORM);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const title = item ? "Edit item" : "Add item";
  const sizes = parseSizes(values.sizes);
  // PATCH deletes watches and alerts for sizes that leave the list (app/api/items/[id]/route.ts).
  const removedSizes = item ? item.sizes.filter((s) => !sizes.includes(s)) : [];
  // From the saved item, so the option stays even after the user picks another category.
  const customCategory = item && !CATEGORIES.some((c) => c.value === item.category) ? item.category : null;

  const set = (f: keyof ItemFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [f]: e.target.value }));
  const aria = (f: keyof ItemFormValues, hint = false, extra?: string) => ({
    id: id(f),
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": [errors[f] ? `${id(f)}-error` : hint ? `${id(f)}-hint` : null, extra].filter(Boolean).join(" ") || undefined,
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const r = toItemBody(values);
    if (!r.ok) {
      setErrors(r.errors);
      const first = FIELD_ORDER.find((f) => r.errors[f]);
      if (first) document.getElementById(id(first))?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await apiFetch(item ? `/api/items/${item.id}` : "/api/items", { method: item ? "PATCH" : "POST", json: r.body });
      onSaved(r.body.name);
    } catch (err) {
      if (item && err instanceof ApiClientError && err.status === 404) {
        onMissing();
        return;
      }
      setFormError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${uid}-title`}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form onSubmit={submit} noValidate className="flex max-h-[85dvh] flex-col">
        <h2 id={`${uid}-title`} className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-700">
          {title}
        </h2>
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {formError}
            </p>
          )}
          <Field id={id("name")} label="Name" error={errors.name}>
            <input {...aria("name")} className={input} value={values.name} onChange={set("name")} autoComplete="off" data-autofocus maxLength={120} />
          </Field>
          <Field id={id("category")} label="Category" error={errors.category}>
            <select {...aria("category")} className={input} value={values.category} onChange={set("category")}>
              <option value="">Choose</option>
              {customCategory && <option value={customCategory}>{customCategory}</option>}
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("sizes")} label="Sizes" hint="Separate sizes with commas, for example 8, 9, 10 or S, M, L." error={errors.sizes}>
            <input {...aria("sizes", true, removedSizes.length > 0 ? `${uid}-removed` : undefined)} className={input} value={values.sizes} onChange={set("sizes")} autoComplete="off" />
          </Field>
          {removedSizes.length > 0 && (
            <p id={`${uid}-removed`} aria-live="polite" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              Removing size {removedSizes.join(", ")} also deletes its price watches and alerts.
            </p>
          )}
          <Field id={id("selectedSize")} label="Your size" error={errors.selectedSize}>
            <select {...aria("selectedSize")} className={input} value={values.selectedSize} onChange={set("selectedSize")}>
              <option value="">Choose</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("typicalPrice")} label="Typical price (USD)" error={errors.typicalPrice}>
            <input {...aria("typicalPrice")} className={input} value={values.typicalPrice} onChange={set("typicalPrice")} inputMode="decimal" autoComplete="off" />
          </Field>
          <Field id={id("sourceUrl")} label="Product link (optional)" error={errors.sourceUrl}>
            <input {...aria("sourceUrl")} className={input} value={values.sourceUrl} onChange={set("sourceUrl")} type="url" inputMode="url" autoComplete="off" />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
