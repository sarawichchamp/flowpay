import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/features/shell/app-shell";
import { getFlowPayBootstrap } from "@/services/flowpay/bootstrap";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"]
});

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
      <body className={kanit.variable}>
        <Providers initialData={initialData}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
