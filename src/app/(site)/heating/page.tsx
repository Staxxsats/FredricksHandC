import type { Metadata } from "next";
import { ServicePage } from "@/components/site/ServicePage";
import { services } from "@/content/site";

export const metadata: Metadata = {
  title: services.heating.metaTitle,
  description: services.heating.intro,
  alternates: { canonical: "/heating" },
};

export default function Page() {
  return <ServicePage kind="heating" />;
}
