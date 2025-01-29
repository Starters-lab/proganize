import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "./context/appContext";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";
import SupabaseProvider from "./supabase-provider";
import { GlobalTopUpModal } from "@/components/shared/GlobalTopUpModal";
import { registerSW } from "./pwa";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Proganize",
  description: "Organize smarter, Document faster",
  metadataBase: new URL("https://proganize.app"),
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Proganize",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  registerSW();

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1'
        />
        <meta name='application-name' content='Proganize' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Proganize' />
        <meta name='format-detection' content='telephone=no' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='theme-color' content='#000000' />

        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        <link rel='manifest' href='/manifest.json' />
      </head>
      <body className={geistSans.variable}>
        <Script
          async
          defer
          src='https://cloud.umami.is/script.js'
          data-website-id='2fd5a43f-e6b3-478d-8e76-d26042f05d11'
        />
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AppProvider>
              <div className='min-h-screen bg-background'>
                {children}
                <GlobalTopUpModal />
                <Toaster />
              </div>
            </AppProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
