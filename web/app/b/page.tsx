import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Proč u brokera nenajdete VOO a co sleduje stejný index",
};

export default function VariantB() {
  return <LandingPage variant="b" />;
}
