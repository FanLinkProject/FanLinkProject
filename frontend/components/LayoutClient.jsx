"use client";

import AppShell from "./layout/AppShell";
import AuthCallbackHandler from "./AuthCallbackHandler";
import { NotificationProvider } from "@/app/providers/NotificationProvider";

export default function LayoutClient({ children }) {
  return (
    <NotificationProvider>
      <AuthCallbackHandler />
      <AppShell>{children}</AppShell>
    </NotificationProvider>
  );
}
