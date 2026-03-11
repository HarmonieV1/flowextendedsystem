export const ACCENT = "#a0e00d";

export const site = {
  name: "FXS | Flow Extended System",
  taglineEn: "Trade Smarter. Not Harder.",
  heroSubtitleFr:
    "FXS enrichit tous tes graphiques avec des insights avancés et t’envoie des signaux filtrés en temps réel.",
  bullets: [
    "Système basé sur 8 ans de trading",
    "Compatible tous marchés",
    "Conçu pour pros et débutants",
  ],
};

export const features = [
  {
    title: "Structure & Tendance",
    desc: "FXS identifie la direction réelle du marché avant toute prise de position.",
  },
  {
    title: "Flow & Liquidité",
    desc: "Détecte zones de piège, manipulation et intérêt institutionnel.",
  },
  {
    title: "Momentum",
    desc: "Les signaux ne sont validés que si le mouvement est exploitable.",
  },
  {
    title: "Analyse multi-couche",
    desc: "Chaque signal est pondéré avant d’être affiché ou envoyé.",
  },
  {
    title: "Market Memory",
    desc: "S’appuie sur le comportement passé pour anticiper les réactions probables.",
  },
  {
    title: "Score & Filtrage",
    desc: "Un score interne filtre les setups faibles et met en avant les meilleurs.",
  },
  {
    title: "Logique algorithmique",
    desc: "Calcul précis, sans interprétation humaine ni biais émotionnel.",
  },
  {
    title: "Confluences",
    desc: "Signal seulement quand plusieurs conditions clés sont alignées.",
  },
  {
    title: "Multi-Timeframe",
    desc: "Le biais higher timeframe filtre et renforce le contexte.",
  },
];

export const pricing = [
  {
    name: "Mensuel",
    price: "99€",
    period: "par mois",
    highlight: false,
    includes: [
      "Accès complet à FXS",
      "Indicateur TradingView",
      "Alertes Telegram",
      "Documentation & Tutoriels",
    ],
    planKey: "mensuel" as const,
  },
  {
    name: "Annuel",
    price: "799€",
    period: "par an",
    highlight: true,
    badge: "Économise 389€",
    includes: [
      "Accès complet à FXS",
      "Indicateur TradingView",
      "Alertes Telegram",
      "Documentation & Tutoriels",
      "Accès prioritaire aux updates",
      "Accès au Skool de PRC",
      "Accès à la bibliothèque",
      "Badge exclusif",
      "Tee-shirts FXS",
    ],
    planKey: "annuel" as const,
  },
  {
    name: "Trimestriel",
    price: "269€",
    period: "pour 3 mois",
    highlight: false,
    includes: [
      "Accès complet à FXS",
      "Indicateur TradingView",
      "Alertes Telegram",
      "Documentation & Tutoriels",
      "Accès prioritaire aux updates",
      "Accès au Skool de PRC",
      "Accès à la bibliothèque",
    ],
    planKey: "trimestriel" as const,
  },
];

export const faqs = [
  {
    q: "Est-ce que j’ai besoin de TradingView ?",
    a: "Oui. FXS est conçu pour TradingView.",
  },
  {
    q: "Sur quels marchés ça fonctionne ?",
    a: "Crypto, indices, actions… FXS est pensé pour être multi-marchés.",
  },
  {
    q: "Je reçois les alertes où ?",
    a: "Via Telegram (et selon tes réglages, via TradingView).",
  },
  {
    q: "C’est adapté aux débutants ?",
    a: "Oui, l’objectif est de simplifier la lecture et de réduire le bruit.",
  },
  {
    q: "Comment j’active mon accès ?",
    a: "Tu cliques sur l’offre, ça ouvre un DM Telegram pré-rempli, et je te donne la procédure.",
  },
];
