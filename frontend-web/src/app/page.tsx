import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
import { Problem } from "@/components/sections/problem";
import { Features } from "@/components/sections/features";
import { Roles } from "@/components/sections/roles";
import { Workflow } from "@/components/sections/workflow";
import { Comparison } from "@/components/sections/comparison";
import { Security } from "@/components/sections/security";
import { Testimonials } from "@/components/sections/testimonials";
import { GettingStarted } from "@/components/sections/getting-started";
import { Cta } from "@/components/sections/cta";
import { Faq } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stats />
        <Problem />
        <Features />
        <Roles />
        <Workflow />
        <Comparison />
        <Security />
        <Testimonials />
        <GettingStarted />
        <Cta />
        <Faq />
      </main>
      <Footer />
    </>
  );
}