import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusAI | Enterprise",
  description: "Secure Offline RAG Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
