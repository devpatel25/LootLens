"use client";

export type UserMenuProps = {
  name: string | null;
  email: string | null;
  signOutAction: () => void | Promise<void>;
};

export default function UserMenu(props: UserMenuProps) {
  void props;
  return null;
}
