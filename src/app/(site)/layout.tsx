import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PrelaunchBar } from "@/components/site/PrelaunchBar";
import { MobileActionBar } from "@/components/site/MobileActionBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-amber focus:px-4 focus:py-2 focus:font-bold focus:text-ink">
        Skip to content
      </a>
      <PrelaunchBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileActionBar />
    </>
  );
}
