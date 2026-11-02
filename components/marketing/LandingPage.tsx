'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChartNoAxesCombined, Globe2, LoaderCircle, Mail, Play, Radio, Search, ShieldCheck, Sparkles } from 'lucide-react';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950';
const primaryButton = `inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_32px_rgba(52,211,153,0.15)] transition hover:bg-emerald-300 ${focus}`;
const secondaryButton = `inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 ${focus}`;

const agents = [
  {
    number: '01', name: 'The Researcher', icon: Search,
    label: 'EVIDENCE OVER NOISE', color: 'text-emerald-400', background: 'bg-emerald-400/10 border-emerald-400/20',
    title: 'Start with what actually happened.',
    description: 'Extracts the facts, key entities, industry, and region from global news. Every claim starts with source evidence, not speculation.',
    detail: 'Source-grounded facts',
  },
  {
    number: '02', name: 'The Analyst', icon: ChartNoAxesCombined,
    label: 'SIGNALS INTO STRATEGY', color: 'text-blue-400', background: 'bg-blue-400/10 border-blue-400/20',
    title: 'Find the opportunity in the change.',
    description: 'Builds specific business, innovation, and investment ideas with a clear customer and revenue model. Scores feasibility, impact, and speed to market.',
    detail: '40% feasibility · 40% impact · 20% speed',
  },
  {
    number: '03', name: 'The Critic', icon: ShieldCheck,
    label: 'CONVICTION, CHALLENGED', color: 'text-emerald-400', background: 'bg-emerald-400/10 border-emerald-400/20',
    title: 'An idea has to earn its place.',
    description: 'Challenges every proposal. Rejects generic ideas, unsupported claims, and unclear monetization so only approved insights reach your terminal.',
    detail: 'Independent approval before publication',
  },
];

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reducedMotion ? 0 : 0.65, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2 text-xs font-bold tracking-tight sm:gap-2.5 sm:text-base">
      <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 sm:size-9">
        <Radio className="size-4 text-emerald-400" aria-hidden="true" />
      </span>
      <span className="text-white">Opportunity <span className="text-emerald-400">Earth</span></span>
    </span>
  );
}

function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    // Mock submission until a production waitlist service is connected.
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitted(true);
    });
  }

  return (
    <div className="w-full lg:max-w-md">
      {submitted ? (
        <div role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-6">
          <CheckCircle2 className="mb-3 size-6 text-emerald-400" aria-hidden="true" />
          <p className="font-semibold text-white">Thanks for your interest.</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">Early-access signup is coming soon. This preview hasn’t submitted your email.</p>
          <Link href="/dashboard" className={`mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 ${focus}`}>
            Explore the live demo <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-busy={pending}>
          <label htmlFor="waitlist-email" className="mb-2 block text-sm font-medium text-slate-200">Your email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="waitlist-email" name="email" type="email" autoComplete="email" required maxLength={254}
              placeholder="you@company.com" disabled={pending}
              className={`w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3.5 pl-11 pr-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 ${focus}`}
            />
          </div>
          <button type="submit" disabled={pending} className={`${primaryButton} mt-3 w-full disabled:cursor-wait disabled:opacity-70`}>
            {pending ? <><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Requesting access…</> : <>Request Early Access <ArrowRight className="size-4" aria-hidden="true" /></>}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Preview signup. No email is submitted or stored yet.</p>
        </form>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-200">
        <a href="#main-content" className={`sr-only z-50 rounded-lg bg-slate-900 px-4 py-3 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 ${focus}`}>Skip to content</a>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px] bg-[radial-gradient(ellipse_at_20%_25%,rgba(16,185,129,0.1),transparent_45%),radial-gradient(ellipse_at_85%_20%,rgba(59,130,246,0.12),transparent_45%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-[650px] bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent)]" />

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-slate-800/70 px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Opportunity Earth home" className={`shrink-0 rounded-xl ${focus}`}><Brand /></Link>
          <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
            <a href="#how-it-works" className={`hidden text-slate-400 transition hover:text-white md:block ${focus}`}>How it works</a>
            <a href="#preview" className={`hidden text-slate-400 transition hover:text-white md:block ${focus}`}>The terminal</a>
            <Link href="/dashboard" className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-300 sm:px-4 sm:text-sm ${focus}`}>
              <span className="sm:hidden">Live demo</span><span className="hidden sm:inline">Open terminal</span><ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </header>

        <main id="main-content">
          <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 text-center sm:px-8 sm:pb-16 sm:pt-24 lg:px-10 lg:pt-28" aria-labelledby="hero-title">
            <Reveal>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-2 font-mono text-[10px] tracking-[0.13em] text-emerald-300 sm:text-xs">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" aria-hidden="true" />
                GLOBAL SIGNALS. YOUR NEXT MOVE.
              </div>
              <h1 id="hero-title" className="mx-auto max-w-6xl text-[clamp(2.7rem,6.5vw,5.5rem)] font-bold leading-[1.07] tracking-[-0.055em] text-white">
                Discover Global <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-blue-400 bg-clip-text text-transparent">Opportunities</span>{' '}
                <span className="block">Before They Happen</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Multi-agent AI analyzes real-time GDELT news to uncover business and investment insights. Turn the world’s next shift into your next opportunity.
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a href="#waitlist" className={primaryButton}>Request Early Access <ArrowRight className="size-4" aria-hidden="true" /></a>
                <Link href="/dashboard" className={secondaryButton}><Play className="size-4" aria-hidden="true" /> View Live Demo</Link>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" aria-hidden="true" /> Evidence-backed insights</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" aria-hidden="true" /> Three-agent review</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-400" aria-hidden="true" /> A global perspective</span>
              </div>
            </Reveal>
          </section>

          <section id="preview" aria-label="Preview the Opportunity Earth dashboard" className="mx-auto max-w-7xl scroll-mt-8 px-5 sm:px-8 lg:px-10">
            <Reveal>
              <figure className="relative rounded-2xl border border-slate-700/70 bg-slate-900/50 p-1.5 shadow-[0_0_80px_-30px_rgba(16,185,129,0.3)] backdrop-blur-md sm:p-2">
                <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
                  <div className="flex items-center gap-2" aria-hidden="true"><span className="size-2 rounded-full bg-slate-600" /><span className="size-2 rounded-full bg-slate-600" /><span className="size-2 rounded-full bg-slate-600" /></div>
                  <figcaption className="flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-slate-400 sm:text-[10px]"><Radio className="size-3 text-emerald-400" aria-hidden="true" /> OPPORTUNITY EARTH / TERMINAL PREVIEW</figcaption>
                  <span className="hidden rounded border border-slate-700 px-2 py-0.5 font-mono text-[9px] text-slate-500 sm:inline">/dashboard</span>
                </div>
                <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden rounded-xl bg-slate-950 sm:aspect-[16/9] sm:min-h-0">
                  <Image src="/dashboard-preview.png" alt="Actual Opportunity Earth dashboard with opportunity cards, market signals, and global intelligence." width={1440} height={1000} sizes="(max-width: 1280px) 100vw, 1200px" loading="eager" className="h-full w-full object-cover object-top opacity-75 blur-[1px]" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="max-w-sm rounded-2xl border border-slate-600/40 bg-slate-950/65 px-5 py-6 text-center shadow-2xl backdrop-blur-xl sm:px-8 sm:py-8">
                      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10"><Globe2 className="size-5 text-emerald-400" aria-hidden="true" /></span>
                      <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">The world, with an edge.</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">Explore global signals. Find high-viability ideas. See the reasoning behind every score.</p>
                      <Link href="/dashboard" className={`${primaryButton} mt-5 w-full px-4`}><Play className="size-4" aria-hidden="true" /> View Live Demo</Link>
                    </div>
                  </div>
                </div>
              </figure>
              <a href="#how-it-works" className={`mx-auto mt-6 flex w-fit items-center gap-2 text-xs text-slate-500 transition hover:text-emerald-300 ${focus}`}>Look beneath the signal <ArrowDown className="size-3" aria-hidden="true" /></a>
            </Reveal>
          </section>

          <section aria-label="Intelligence you can inspect" className="mx-auto mt-16 max-w-7xl px-5 sm:px-8 lg:px-10">
            <Reveal className="grid gap-7 border-y border-slate-800/80 py-8 sm:grid-cols-3 sm:gap-4 sm:py-10">
              <div className="flex items-center justify-center gap-3"><Globe2 className="size-6 text-slate-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-200">Powered by GDELT</p><p className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">GLOBAL NEWS SIGNALS</p></div></div>
              <div className="flex items-center justify-center gap-3"><Sparkles className="size-6 text-slate-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-200">Three independent roles</p><p className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">RESEARCH · ANALYSIS · CRITIQUE</p></div></div>
              <div className="flex items-center justify-center gap-3"><ShieldCheck className="size-6 text-slate-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-200">Evidence before conviction</p><p className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">INSPECT THE REASONING</p></div></div>
            </Reveal>
          </section>

          <section id="how-it-works" aria-labelledby="agents-title" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
            <Reveal className="mb-10 max-w-2xl sm:mb-14">
              <p className="mb-4 font-mono text-[11px] tracking-[0.18em] text-emerald-400">BUILT TO CHALLENGE ITSELF</p>
              <h2 id="agents-title" className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">Three agents.<br /><span className="text-slate-400">One higher standard.</span></h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">A headline is just the beginning. Our AI team separates facts from assumptions, builds a concrete opportunity, and puts it through a critical review.</p>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
              {agents.map((agent, index) => (
                <Reveal key={agent.name} delay={index * 0.1} className="h-full">
                  <article className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-slate-600 sm:p-7 motion-reduce:transform-none">
                    <div className="mb-8 flex items-center justify-between">
                      <span className={`flex size-11 items-center justify-center rounded-xl border ${agent.background}`}><agent.icon className={`size-5 ${agent.color}`} aria-hidden="true" /></span>
                      <span className="font-mono text-xs text-slate-600">/{agent.number}</span>
                    </div>
                    <p className={`mb-3 font-mono text-[9px] tracking-[0.12em] ${agent.color}`}>{agent.label}</p>
                    <h3 className="text-xl font-semibold tracking-tight text-white">{agent.name}</h3>
                    <p className="mt-3 text-sm font-medium text-slate-200">{agent.title}</p>
                    <p className="mb-7 mt-3 text-sm leading-relaxed text-slate-400">{agent.description}</p>
                    <div className="mt-auto flex items-start gap-2 border-t border-slate-800 pt-4 text-[11px] leading-relaxed text-slate-400"><Check className={`mt-0.5 size-3.5 shrink-0 ${agent.color}`} aria-hidden="true" />{agent.detail}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="waitlist" aria-labelledby="waitlist-title" className="mx-auto max-w-7xl scroll-mt-8 px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10">
            <Reveal className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 p-6 backdrop-blur-md sm:p-10 lg:p-14">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_55%)]" />
              <div className="relative flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-center lg:gap-16">
                <div className="max-w-xl">
                  <p className="mb-4 font-mono text-[11px] tracking-[0.18em] text-emerald-400">GET THERE EARLY</p>
                  <h2 id="waitlist-title" className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">Your next opportunity<br />won’t wait.</h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">Get early access to a sharper view of what’s next. Less noise. Clearer reasoning. A head start on your next move.</p>
                </div>
                <WaitlistForm />
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-5 border-t border-slate-800 px-5 py-7 sm:flex-row sm:items-center sm:px-8 lg:px-10">
          <Link href="/" className={`rounded-xl ${focus}`}><Brand /></Link>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Opportunity Earth. Global signals. Grounded decisions.</p>
          <Link href="/dashboard" className={`inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-emerald-300 ${focus}`}>Explore the terminal <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
        </footer>
      </div>
    </MotionConfig>
  );
}
