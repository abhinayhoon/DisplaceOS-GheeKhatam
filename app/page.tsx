import LandingNav from "@/components/landing/landing-nav";
import ScrollProgress from "@/components/landing/scroll-progress";
import Hero from "@/components/landing/hero";
import LifecycleMarquee from "@/components/landing/lifecycle-marquee";
import ChallengeSolution from "@/components/landing/challenge-solution";
import TwoSteps from "@/components/landing/two-steps";
import RoleTabs from "@/components/landing/role-tabs";
import Capabilities from "@/components/landing/capabilities";
import Comparison from "@/components/landing/comparison";
import FinalCta from "@/components/landing/final-cta";
import SiteFooter from "@/components/landing/site-footer";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <LandingNav />
      <main id="top" className="flex-1 overflow-x-clip">
        <Hero />
        <LifecycleMarquee />
        <ChallengeSolution />
        <TwoSteps />
        <RoleTabs />
        <Capabilities />
        <Comparison />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
