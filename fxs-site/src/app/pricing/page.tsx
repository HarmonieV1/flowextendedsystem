import { Container, Section, Badge, Button, Card } from "@/components/ui";
import { pricing } from "@/lib/content";
import { TELEGRAM_LINKS } from "@/lib/links";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main>
      <header className="border-b border-white/10 bg-[#0b0d0c]">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide">
            FXS
          </Link>
          <div className="flex items-center gap-3">
            <Button href="/" variant="secondary">
              Retour
            </Button>
          </div>
        </Container>
      </header>

      <Section>
        <Container>
          <div className="text-center">
            <Badge>PRICING</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Choisis l’offre qui te convient
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Chaque offre ouvre un DM Telegram pré-rempli pour activer ton accès.
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
    </main>
  );
}
