import Link from "next/link";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", className)}>
      {children}
    </section>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
      {children}
    </span>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
  newTab,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  newTab?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0e00d]/40";
  const styles =
    variant === "primary"
      ? "bg-[#a0e00d] text-black hover:bg-[#b6ff1a]"
      : "border border-white/15 bg-white/5 text-white hover:bg-white/10";

  const props = newTab
    ? { target: "_blank", rel: "noreferrer" }
    : undefined;

  return (
    <Link href={href} className={cn(base, styles, className)} {...props}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
