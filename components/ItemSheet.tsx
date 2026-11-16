"use client";

import type { Item } from "@/lib/types";

export type ItemSheetProps = {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSaved: (name: string) => void;
};

export default function ItemSheet(props: ItemSheetProps) {
  void props;
  return null;
}
