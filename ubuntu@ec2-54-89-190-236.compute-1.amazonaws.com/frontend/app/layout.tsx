import type { Metadata } from "next";

import { Providers } from "../components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LDC Operations",
  description: "Internal Catholic matchmaking operations console"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
