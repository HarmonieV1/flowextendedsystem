import Link from "next/link";
import { Container, Section, Badge, Button, Card } from "@/components/ui";
import { features, site } from "@/lib/content";
import { pricing } from "@/lib/content";
import { TELEGRAM_LINKS } from "@/lib/links";
import { testimonials } from "@/lib/testimonials";

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/70">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a0e00d]/15 text-[#a0e00d]">
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d0c]/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide">
            FXS
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 sm:flex">
            <Link href="#about" className="hover:text-white">
              À propos
            </Link>
            <Link href="#features" className="hover:text-white">
              Fonctionnement
            </Link>
            <Link href="#product" className="hover:text-white">
              Produit
            </Link>
            <Link href="#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-white">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button href="#pricing" variant="primary">
              Accéder à FXS
            </Button>
          </div>
        </Container>
      </header>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <Section>
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex justify-center">
                <Badge>MADE FOR TradingView</Badge>
              </div>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                <span className="text-white">Trade </span>
                <span className="text-[#a0e00d]">Smarter</span>
                <span className="text-white">. Not </span>
                <span className="text-[#a0e00d]">Harder</span>
                <span className="text-white">.</span>
              </h1>
              <p className="mt-5 text-pretty text-base text-white/70 sm:text-lg">
                {site.heroSubtitleFr}
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="https://fr.tradingview.com/script/pEvKZ6To/" variant="secondary" newTab>
                  Découvrir le script
                </Button>
                <Button href="#pricing" variant="primary">
                  Accéder à FXS
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {site.bullets.map((b) => (
                  <Check key={b}>{b}</Check>
                ))}
              </div>
            </div>
          </Container>
        </Section>
      </div>

      <Section id="about">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <Badge>À PROPOS</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Basé sur <span className="text-[#a0e00d]">8 ans</span>
                <br /> d’expérience
              </h2>
              <p className="mt-4 text-white/70">
                FXS est né d’une vision simple : rendre la lecture du marché plus
                claire, plus structurée, et plus exploitable. Un système pensé
                pour réduire le bruit, filtrer les pièges, et te donner du
                contexte.
              </p>
              <div className="mt-6 space-y-3">
                <Check>Classé Top 500 / 150 000 traders experts (Bitget)</Check>
                <Check>Trader actif depuis +8 ans (tous cycles)</Check>
                <Check>Historique & approche structurée</Check>
              </div>
            </div>
            <Card className="p-8">
              <div className="text-sm text-white/60">Fondateur</div>
              <div className="mt-1 text-xl font-semibold">Alpha_PRC</div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white/60">Expérience</div>
                  <div className="mt-1 text-lg font-semibold">8+ ans</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white/60">Classement</div>
                  <div className="mt-1 text-lg font-semibold">Top 500</div>
                </div>
              </div>
              <div className="mt-5 text-sm text-white/60">
                Remplace cette carte par ta photo/asset quand tu veux.
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      <Section id="features">
        <Container>
          <div className="text-center">
            <Badge>COMMENT FXS FONCTIONNE</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              La logique derrière chaque signal <span className="text-[#a0e00d]">FXS</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Un signal FXS n’est pas un “voyant vert”. C’est une confluence de
              contexte, de flux et de validation.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="h-full">
                <div className="text-lg font-semibold">{f.title}</div>
                <p className="mt-2 text-sm text-white/70">{f.desc}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section id="product">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <Badge>PRODUIT</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Des graphiques qui parlent vraiment
              </h2>
              <p className="mt-4 text-white/70">
                Une fois FXS activé sur TradingView, ton chart est enrichi
                automatiquement : dashboard, signaux, contexte, filtrage. Moins
                d’indicateurs, plus de clarté.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                <li>• Dashboard d’insights (risk, score, momentum, HTF bias…)</li>
                <li>• Signaux clairs (BUY / SL / TP / etc.)</li>
                <li>• Compatible multi-marchés & multi-timeframes</li>
              </ul>
              <div className="mt-8">
                <Button
                  href="https://fr.tradingview.com/script/pEvKZ6To/"
                  variant="secondary"
                  newTab
                >
                  Voir l’indicateur sur TradingView
                </Button>
              </div>
            </div>
            <Card className="p-8">
              <div className="text-sm text-white/60">Mock</div>
              <div className="mt-2 text-white/80">
                Ici tu peux intégrer un screenshot TradingView (image).
              </div>
              <div className="mt-5 aspect-video w-full rounded-xl border border-white/10 bg-black/30" />
            </Card>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Card className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <Badge>TELEGRAM</Badge>
              <h3 className="mt-4 text-2xl font-semibold">
                Des alertes claires, au bon endroit
              </h3>
              <p className="mt-2 text-white/70">
                Reçois les signaux FXS en temps réel avec le contexte du setup,
                directement sur Telegram.
              </p>
            </div>
            <Button href="#pricing" variant="primary">
              Voir les offres
            </Button>
          </Card>
        </Container>
      </Section>

      <Section id="pricing">
        <Container>
          <div className="text-center">
            <Badge>PRICING</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Choisis l’offre qui te convient
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Clique sur une offre pour ouvrir un DM Telegram pré-rempli.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {pricing.map((p) => {
              const href = TELEGRAM_LINKS[p.planKey];
              return (
                <Card
                  key={p.name}
                  className={
                    p.highlight
                      ? "border-[#a0e00d]/40 bg-[#a0e00d]/10"
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{p.name}</div>
                      <div className="mt-2 flex items-end gap-2">
                        <div className="text-3xl font-semibold">{p.price}</div>
                        <div className="pb-1 text-sm text-white/60">{p.period}</div>
                      </div>
                    </div>
                    {p.badge ? (
                      <span className="rounded-full bg-[#a0e00d] px-3 py-1 text-xs font-semibold text-black">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-6 space-y-2 text-sm text-white/70">
                    {p.includes.map((it) => (
                      <li key={it}>• {it}</li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button href={href} variant={p.highlight ? "primary" : "secondary"} newTab>
                      Accéder à FXS
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center text-sm text-white/60">
            Support uniquement via Telegram : <span className="text-white">@alpha_fxs</span>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="text-center">
            <Badge>TÉMOIGNAGES</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ils tradent avec FXS au quotidien
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <p className="text-sm text-white/80">“{t.text}”</p>
                <div className="mt-4 text-xs text-white/60">
                  {t.name} · {t.date}
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <footer className="border-t border-white/10 py-10">
        <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/60">© {new Date().getFullYear()} FXS</div>
          <div className="flex gap-5 text-sm text-white/70">
            <Link href="#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-white">
              FAQ
            </Link>
          </div>
        </Container>
      </footer>
    </main>
  );
}
