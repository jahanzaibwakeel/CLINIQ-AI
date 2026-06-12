import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediPilot AI",
  description: "Local-first AI clinical workflow assistant for doctors and small clinics."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
