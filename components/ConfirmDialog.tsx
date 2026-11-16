"use client";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export default function ConfirmDialog(props: ConfirmDialogProps) {
  void props;
  return null;
}
