import { Container, Section, Badge, Card, Button } from "@/components/ui";
import { faqs } from "@/lib/content";
import Link from "next/link";

export default function FaqPage() {
  return (
    <main>
      <header className="border-b border-white/10 bg-[#0b0d0c]">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide">
            FXS
          </Link>
          <Button href="/pricing" variant="primary">
            Accéder à FXS
          </Button>
        </Container>
      </header>

      <Section>
        <Container>
          <div className="text-center">
            <Badge>FAQ</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Questions fréquentes
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Si tu as une question, écris-moi sur Telegram : @alpha_fxs
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqs.map((f) => (
              <Card key={f.q}>
                <div className="text-base font-semibold">{f.q}</div>
                <div className="mt-2 text-sm text-white/70">{f.a}</div>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button href="/pricing" variant="primary">
              Voir les offres
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
