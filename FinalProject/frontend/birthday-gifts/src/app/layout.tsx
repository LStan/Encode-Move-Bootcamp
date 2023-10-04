"use client"

import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { WalletKitProvider } from "@mysten/wallet-kit";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Birthday Gifts",
//   description: "App to give birthday gifts",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletKitProvider>{children}</WalletKitProvider>
      </body>
    </html>
  );
}
