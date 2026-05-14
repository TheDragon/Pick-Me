"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wallet";

declare global {
  interface Window {
    __pickmeCreditLogged?: boolean;
  }
}

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.__pickmeCreditLogged) {
      return;
    }

    window.__pickmeCreditLogged = true;
    console.info("%cMADE BY BHUTAN (GCIT) --- P.A.N.D.A", "color: #7dd3fc; font-weight: 800; letter-spacing: 0.08em;");
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
