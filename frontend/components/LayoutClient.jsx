"use client";

import { useEffect } from "react";
import axios from "axios";
import AppShell from "./layout/AppShell";
import AuthCallbackHandler from "./AuthCallbackHandler";
import { NotificationProvider } from "@/app/providers/NotificationProvider";
import { redirectToGuestHome } from "@/lib/authRedirect";

export default function LayoutClient({ children }) {
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          redirectToGuestHome();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <NotificationProvider>
      <AuthCallbackHandler />
      <AppShell>{children}</AppShell>
    </NotificationProvider>
  );
}
