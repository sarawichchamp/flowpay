import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/features/shell/app-shell";
import { getFlowPayBootstrap } from "@/services/flowpay/bootstrap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FlowPay",
  description: "Shared food wallet and settlement app for couples",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
    shortcut: ["/icons/icon-192.svg"]
  },
  appleWebApp: {
    capable: true,
    title: "FlowPay",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialData = await getFlowPayBootstrap();

  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers initialData={initialData}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
