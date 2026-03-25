import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoStats — Spotify Analytics",
  description:
    "Discover insights about your Spotify listening habits with beautiful visualizations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EchoStats",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(reg) {
              console.log('[EchoStats] SW registered, scope:', reg.scope);
            })
            .catch(function(err) {
              console.warn('[EchoStats] SW registration failed:', err);
            });
        });
      }
    `,
          }}
        />
      </body>
    </html>
  );
}
