import type { Metadata } from "next";
import { ServicePage } from "@/components/site/ServicePage";
import { services } from "@/content/site";

export const metadata: Metadata = {
  title: services.repairs.metaTitle,
  description: services.repairs.intro,
  alternates: { canonical: "/repairs" },
};

export default function Page() {
  return <ServicePage kind="repairs" />;
}
