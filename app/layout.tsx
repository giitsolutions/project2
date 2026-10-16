import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "PriceMyTrip | Zero-Based Freight Trip Cost Calculator",
    template: "%s | PriceMyTrip",
  },
  description:
    "Transport trip cost calculator with a 10 cost-head breakdown for Indian freight lanes. Estimate end-to-end commercial haulage expenses with live diesel prices, route distances, and toll costs.",
  keywords: [
    "freight cost calculator",
    "trip cost calculator",
    "truck freight rates India",
    "zero based costing logistics",
    "commercial haulage pricing",
    "diesel price route calculator",
    "PriceMyTrip",
  ],
  authors: [{ name: "PriceMyTrip Team" }],
  creator: "PriceMyTrip",
  publisher: "PriceMyTrip",
  metadataBase: new URL("https://pricemytrip.arvindconsulting.com"), // Replace with your live production domain
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PriceMyTrip | Zero-Based Freight Trip Cost Calculator",
    description:
      "Predictable freight pricing grounded in real costs. Calculate route distances, fuel expenses, and 10 cost-head breakdowns across Indian freight lanes.",
    url: "https://pricemytrip.arvindconsulting.com", // Replace with your live production domain
    siteName: "PriceMyTrip",
    images: [
      {
        url: "/images/image.png",
        width: 1200,
        height: 630,
        alt: "PriceMyTrip Freight Cost Calculator Preview",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PriceMyTrip | Zero-Based Freight Cost Calculator",
    description:
      "Calculate commercial haulage & trip costs with live route, fuel, and toll parameters.",
    images: ["/images/image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}