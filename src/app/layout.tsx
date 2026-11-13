import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { DemoBar } from "@/components/DemoBar";
import { getRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CrossBo: creator trips you can book",
  description: "Hackathon prototype. Creators turn reels into bookable trips and earn on every booking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen font-sans text-foreground">
        <Providers>
          <DemoBar role={getRole()} />
          {children}
          <footer className="px-4 py-8 text-center text-xs text-default-500">
            CrossBo is a concept-stage prototype. All bookings, prices, inventory, commissions and earnings are illustrative. No payment is taken.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
