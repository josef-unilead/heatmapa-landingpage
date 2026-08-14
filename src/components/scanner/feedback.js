// Zvuk a vibrace po skenu.
//
// Obsluha se u dveří na displej nedívá. Rozdíl mezi propuštěním a odmítnutím
// musí být slyšet dřív, než stihne zvednout oči. Proto jsou tóny výrazně
// odlišné, ne dvě podobná pípnutí.
//
// Zvuk se skládá za běhu, ne ze souborů. Nemá smysl kvůli dvěma pípnutím
// stahovat audio a čekat, až se načte.

let audio;

function kontext() {
  if (!audio) {
    const Kontext = window.AudioContext ?? window.webkitAudioContext;
    if (!Kontext) return null;
    audio = new Kontext();
  }
  // iOS uspí zvukový kontext, kdykoli se aplikace odloží. Bez probuzení by
  // čtečka po návratu k telefonu mlčela.
  if (audio.state === "suspended") audio.resume().catch(() => {});
  return audio;
}

function ton(frekvence, delka, zpozdeni = 0, hlasitost = 0.25) {
  const ctx = kontext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const zisk = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frekvence;

  const start = ctx.currentTime + zpozdeni;
  // Náběh a doběh, aby to nelupalo.
  zisk.gain.setValueAtTime(0, start);
  zisk.gain.linearRampToValueAtTime(hlasitost, start + 0.01);
  zisk.gain.linearRampToValueAtTime(0, start + delka);

  osc.connect(zisk).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + delka + 0.02);
}

/** Krátké vysoké dvojpípnutí, stoupavé. */
export function zvukProsel() {
  ton(880, 0.09);
  ton(1320, 0.11, 0.09);
  navigator.vibrate?.(60);
}

/** Nízké delší zabzučení, jednoznačně jiné. */
export function zvukOdmitnut() {
  ton(220, 0.28, 0, 0.3);
  navigator.vibrate?.([90, 70, 90]);
}

/** Neutrální cvaknutí pro věci, které nejsou ani průchod, ani odmítnutí. */
export function zvukNeutralni() {
  ton(560, 0.07, 0, 0.18);
}

/**
 * Zvukový kontext musí vzniknout z dotyku uživatele, jinak ho prohlížeč
 * umlčí. Voláme to při přihlášení, což je první klepnutí obsluhy.
 */
export function probudZvuk() {
  const ctx = kontext();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
}
