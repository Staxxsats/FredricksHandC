import type { Metadata } from "next";
import { ServicePage } from "@/components/site/ServicePage";
import { services } from "@/content/site";

export const metadata: Metadata = {
  title: services.cooling.metaTitle,
  description: services.cooling.intro,
  alternates: { canonical: "/cooling" },
};

export default function Page() {
  return <ServicePage kind="cooling" />;
}
