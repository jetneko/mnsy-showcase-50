import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, HardHat, Home, Hammer, Ruler, ShieldCheck, Wrench, Phone, Mail, MapPin, Facebook } from "lucide-react";
import logoUrl from "@/assets/mnsy-logo.jpg";
import heroHome from "@/assets/hero-home.jpg";
import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";
import project5 from "@/assets/project-5.jpg";
import project6 from "@/assets/project-6.jpg";
import project7 from "@/assets/project-7.jpg";
import { AboutScene } from "@/components/AboutScene";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MNSY Construction — Residential & Commercial Contractor Philippines" },
      { name: "description", content: "MNSY Construction builds and renovates residential and commercial properties across the Philippines. Precision planning, quality craftsmanship, on-time delivery." },
      { property: "og:title", content: "MNSY Construction — Residential & Commercial Contractor Philippines" },
      { property: "og:description", content: "MNSY Construction builds and renovates residential and commercial properties across the Philippines. Precision planning, quality craftsmanship, on-time delivery." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "GeneralContractor",
          name: "MNSY Construction",
          description: "Residential and commercial construction, renovation, and project management contractor based in the Philippines.",
          areaServed: "Philippines",
          url: "/",
          sameAs: ["https://www.facebook.com/mnsycons/"],
          address: {
            "@type": "PostalAddress",
            addressCountry: "PH",
            addressRegion: "Rizal",
          },
        }),
      },
    ],
  }),
});

const services = [
  { icon: Home, title: "Residential Construction", body: "New homes built to your vision — from foundations to finishing, with structural integrity at every step." },
  { icon: Hammer, title: "Commercial Builds", body: "Offices, retail, and mixed-use projects delivered with disciplined scheduling and cost control." },
  { icon: Wrench, title: "Renovations & Remodels", body: "Interior and exterior transformations that respect existing structure and elevate everyday living." },
  { icon: Ruler, title: "Design & Planning", body: "Pre-construction planning, permits, and coordination that keep projects on time and on budget." },
  { icon: HardHat, title: "Project Management", body: "One accountable team overseeing trades, materials, and schedule from groundbreak to handover." },
  { icon: ShieldCheck, title: "Quality & Safety", body: "Site safety protocols and quality audits baked into every phase — no shortcuts, no surprises." },
];

const projects = [
  { src: project2, title: "Two-Storey Residence", location: "Eastville, Cainta Rizal", tag: "Residential" },
  { src: project6, title: "Mixed-Use Building", location: "Metro Manila", tag: "Commercial" },
  { src: project5, title: "Master Bedroom Renovation", location: "Sampaloc, Tanay Rizal", tag: "Renovation" },
  { src: project4, title: "Custom Staircase Build", location: "Private Residence", tag: "Interior" },
  { src: project3, title: "Bathroom Remodel", location: "Sampaloc, Tanay Rizal", tag: "Renovation" },
  { src: project1, title: "Roofing & Exterior Works", location: "Rizal Province", tag: "Residential" },
];

const stats = [
  { value: "50+", label: "Projects delivered" },
  { value: "10+", label: "Years of experience" },
  { value: "100%", label: "Client-focused delivery" },
  { value: "0", label: "Compromises on quality" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Stats />
      <CinematicLogo />
      <AboutScene />
      <Services />
      <Projects />
      <MissionVision />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-3">
          <img src={logoUrl} alt="MNSY Construction logo" width={44} height={44} className="h-11 w-11 rounded-full" />
          <div className="leading-tight">
            <div className="font-display text-lg font-black tracking-tight text-primary">MNSY</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-secondary">Construction</div>
          </div>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            ["About", "#about"],
            ["Services", "#services"],
            ["Projects", "#projects"],
            ["Contact", "#contact"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-medium text-foreground/80 transition hover:text-primary">
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-brand-navy-deep"
        >
          Get a quote <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  const showcase = [project2, project6, project5, project4, project3, project1];
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % showcase.length);
    }, 3500);
    return () => clearInterval(id);
  }, [showcase.length]);
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroHome} alt="Modern two-storey residential home built by MNSY Construction" width={1920} height={1200} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-deep/95 via-brand-navy-deep/75 to-brand-navy-deep/30" />
      </div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-28 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:py-40">
        <div className="relative z-10 max-w-2xl text-foreground">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> General Contractor · Philippines
          </div>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Building spaces that <span className="text-secondary">last a lifetime</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium text-foreground/95">
            MNSY Construction plans, builds, and renovates residential and commercial projects with precision, safety, and craftsmanship at every stage.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#projects" className="inline-flex items-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-lg transition hover:bg-brand-green-deep">
              View our work <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-card">
              Start a project
            </a>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[60%] md:block">
          {showcase.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: i === activeIdx ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-deep via-brand-navy-deep/70 to-transparent" />
          <div className="absolute inset-0 bg-brand-navy-deep/30" />
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return StatsInner();
}

function CinematicLogo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress goes 0 -> 1 as the section travels through the viewport
      const raw = 1 - (rect.top + rect.height * 0.2) / vh;
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scale = 0.4 + progress * 1.4;
  const opacity = Math.min(1, progress * 2);
  const letterShift = (1 - progress) * 40;
  const glow = progress;

  return (
    <section
      ref={ref}
      aria-label="MNSY Construction logo reveal"
      className="relative overflow-hidden bg-brand-navy-deep"
      style={{ minHeight: "90vh" }}
    >
      <div
        className="absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in oklab, var(--secondary) 25%, transparent) 0%, transparent 60%)",
          opacity: 0.4 + glow * 0.6,
          transition: "opacity 150ms linear",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-navy-deep via-transparent to-brand-navy-deep" />
      <div className="sticky top-0 flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-8 px-6 text-center">
          <img
            src={logoUrl}
            alt="MNSY Construction logo"
            width={220}
            height={220}
            className="h-40 w-40 rounded-full md:h-56 md:w-56"
            style={{
              transform: `scale(${scale})`,
              opacity,
              filter: `drop-shadow(0 0 ${20 + glow * 60}px color-mix(in oklab, var(--secondary) ${
                30 + glow * 50
              }%, transparent))`,
              transition: "filter 200ms linear",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function StatsInner() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display text-4xl font-black text-primary md:text-5xl">{s.value}</div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Old About() section removed — replaced by the scroll-driven <AboutScene />.

function Services() {
  return (
    <section id="services" className="bg-brand-navy-deep text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <SectionLabel dark>What we do</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-5xl">
            End-to-end construction services.
          </h2>
          <p className="mt-4 text-foreground/90">
            One accountable partner for every phase of your build — engineering, execution, and everything between.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="group rounded-lg border border-border bg-card p-8 transition hover:border-secondary/70 hover:bg-muted">
              <s.icon className="h-8 w-8 text-secondary" />
              <h3 className="mt-6 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section id="projects" className="mx-auto max-w-7xl px-6 py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <SectionLabel>Selected work</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight text-primary md:text-5xl">
            Past projects across the Philippines.
          </h2>
        </div>
        <p className="max-w-sm text-foreground/90">
          A snapshot of residential builds, renovations, and commercial work delivered for our clients.
        </p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <article key={p.title} className={`group relative overflow-hidden rounded-lg bg-card shadow-md transition hover:shadow-xl ${i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
            <div className={`overflow-hidden ${i === 0 ? "aspect-[16/11]" : "aspect-[4/3]"}`}>
              <img src={p.src} alt={`${p.title} — ${p.location}`} width={1200} height={900} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navy-deep/95 via-brand-navy-deep/60 to-transparent p-6 pt-16 text-primary-foreground">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">{p.tag}</div>
              <h3 className="mt-1 font-display text-xl font-bold">{p.title}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                <MapPin className="h-3.5 w-3.5" /> {p.location}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MissionVision() {
  return (
    <section className="bg-brand-cream/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 md:grid-cols-2">
        <div className="rounded-lg border-l-4 border-secondary bg-card p-10 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">Mission</div>
          <p className="mt-5 text-lg leading-relaxed text-foreground/95">
            To provide exceptional construction services that surpass client expectations. We prioritize quality workmanship, safety, and open communication throughout the entire construction process — building strong relationships and offering personalized solutions and innovative approaches to each project.
          </p>
        </div>
        <div className="rounded-lg border-l-4 border-primary bg-card p-10 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Vision</div>
          <p className="mt-5 text-lg leading-relaxed text-foreground/95">
            To be known for our commitment to excellence, integrity, and professionalism in every project we undertake. We aim to set the industry standard for quality craftsmanship, innovative construction techniques, and unparalleled customer service.
          </p>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-brand-navy text-foreground">
      <div className="absolute inset-0 -z-10 opacity-20">
        <img src={project7} alt="" width={1200} height={900} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-5">
        <div className="md:col-span-3">
          <SectionLabel dark>Start your project</SectionLabel>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-5xl">
            Have a build or renovation in mind? Let's talk.
          </h2>
          <p className="mt-5 max-w-xl text-foreground/90">
            Share a few details about your project and our team will get back with next steps, a realistic timeline, and a transparent estimate.
          </p>
          <div className="mt-10 space-y-4">
            <ContactRow icon={Facebook} label="Facebook" value="facebook.com/mnsycons" href="https://www.facebook.com/mnsycons/" />
            <ContactRow icon={Mail} label="Email" value="[Email Protected]" href="mailto:[Email Protected]" />
            <ContactRow icon={Phone} label="Phone" value="Available on request" />
            <ContactRow icon={MapPin} label="Service area" value="Mega Manila, Philippines" />
          </div>
        </div>
        <form className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-2xl md:col-span-2" onSubmit={(e) => e.preventDefault()}>
          <h3 className="font-display text-2xl font-bold text-primary">Request a quote</h3>
          <div className="mt-6 space-y-4">
            <Field label="Full name" name="name" placeholder="Juan Dela Cruz" />
            <Field label="Email" name="email" type="email" placeholder="[Email Protected]" />
            <Field label="Phone" name="phone" placeholder="+63 900 000 0000" />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project details</label>
              <textarea rows={4} placeholder="Tell us about your project…" className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-brand-navy-deep">
              Send inquiry <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }) {
  const Content = (
      <div className="flex items-center gap-4 rounded-md border border-border bg-card px-5 py-4 backdrop-blur-sm transition hover:border-secondary/70 hover:bg-muted">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/20 text-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{Content}</a> : Content;
}

function Field({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="MNSY Construction" width={32} height={32} className="h-8 w-8 rounded-full" />
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MNSY Construction. All rights reserved.
          </div>
        </div>
        <a href="https://www.facebook.com/mnsycons/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <Facebook className="h-4 w-4" /> facebook.com/mnsycons
        </a>
      </div>
    </footer>
  );
}

function SectionLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] ${dark ? "text-secondary" : "text-secondary"}`}>
      <span className="h-px w-8 bg-current" />
      {children}
    </div>
  );
}