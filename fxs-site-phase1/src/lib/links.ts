export const TRADINGVIEW_SCRIPT_URL = "https://fr.tradingview.com/script/pEvKZ6To/";
export const TELEGRAM_USERNAME = "alpha_fxs";

function enc(s: string) {
  return encodeURIComponent(s);
}

export function telegramPrefillLink(planLabel: string) {
  const msg = `Salut Alpha,\n\nJe souhaite activer mon accès FXS.\n\nPlan : ${planLabel}\n\nPeux-tu me donner les instructions pour finaliser ?\n\nMerci.`;
  return `https://t.me/${TELEGRAM_USERNAME}?text=${enc(msg)}`;
}

export const TELEGRAM_LINKS = {
  mensuel: telegramPrefillLink("Mensuel"),
  trimestriel: telegramPrefillLink("Trimestriel"),
  annuel: telegramPrefillLink("Annuel"),
};
