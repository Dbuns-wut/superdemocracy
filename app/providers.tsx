"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { SessionProvider } from "@/lib/auth/use-session";
import { NotificationBell } from "@/components/NotificationBell";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <NotificationBell />
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}
