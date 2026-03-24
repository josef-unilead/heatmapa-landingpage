import { createContext, useContext, useState } from "react";

const translations = {
  cs: {
    // Hero
    heroTitle1: "Objevte co se",
    heroHighlight: "děje",
    heroTitle2: "kolem vás",
    heroSub: "Místní podniky a události v reálném čase na živé mapě.",
    heroWaitlist: "Připojit se na waitlist",
    heroLearn: "Zjistit více",

    // About
    aboutTitle1: "Vaše město,",
    aboutHighlight: "živě",
    aboutTitle2: "na mapě",
    aboutSub: "Vše co se děje kolem vás — skryté klenoty, žhavé akce — vše na jedné živoucí mapě.",
    feat1Title: "Živá mapa podniků",
    feat1Desc: "Restaurace, obchody a další — vše aktualizované v reálném čase na interaktivní mapě.",
    feat2Title: "Události v reálném čase",
    feat2Desc: "Koncerty, pop-upy, trhy — objevte události hned jak se objeví poblíž.",
    feat3Title: "Heat zóny",
    feat3Desc: "Podívejte se kde je rušno. Vizualizace hustoty aktivity, abyste rychle našli energii.",
    feat4Title: "Okamžité aktualizace",
    feat4Desc: "Žádný refresh. Mapa se vyvíjí živě jak se věci otevírají, začínají a mění.",

    // JoinUs
    joinTitle1: "Pro koho je",
    joinHighlight: "Heatmapa",
    joinTitle2: "?",
    joinSub: "Ať už vlastníte podnik, pořádáte akce, nebo rádi objevujete — Heatmapa je pro vás.",
    role1Title: "Majitel podniku",
    role1Desc: "Buďte objeveni lidmi, kteří právě teď hledají místa poblíž.",
    role2Title: "Pořadatel akcí",
    role2Desc: "Oslovte místní když na tom nejvíc záleží — když se vaše akce koná.",
    role3Title: "Objevovatel",
    role3Desc: "Najděte nejlepší místa a události bez nekonečného scrollování sociálními sítěmi.",
    joinCta: "Získat early access",

    // JoinTeam
    teamTitle1: "Přidejte se k",
    teamHighlight: "týmu",
    teamSub: "Jsme malý startup s velkými ambicemi. Přidejte se brzy a pomozte formovat, jak lidé objevují své město.",
    pos1Title: "Ambasador",
    pos1Type: "Part-time · Remote",
    pos1Desc: "Reprezentujte Heatmapu ve svém městě. Spojte se s místními podniky, šiřte slovo na akcích a pomozte nám růst komunitu po komunitě.",
    pos1Perks: ["Flexibilní rozvrh", "Early access", "Provize"],
    pos2Title: "Social Media Manager",
    pos2Type: "Part-time · Remote",
    pos2Desc: "Vlastněte naši sociální přítomnost. Tvořte poutavý obsah, budujte publikum a vyprávějte příběh Heatmapy na Instagramu, TikToku a X.",
    pos2Perks: ["Kreativní svoboda", "Equity opce", "Růstová role"],
    applyCta: "Přihlásit se",

    // Waitlist Form
    wlTitle1: "Buď první",
    wlHighlight: "na mapě",
    wlSub: "Zaregistruj se do waitlistu a získej přístup dříve než ostatní.",
    wlWho: "Kdo jsi?",
    wlRole1: "Tvůrce akcí",
    wlRole1Desc: "Pořádám eventy a akce",
    wlRole2: "Majitel podniku",
    wlRole2Desc: "Vlastním podnik / provozovnu",
    wlRole3: "Objevovatel",
    wlRole3Desc: "Objevuji nová místa a zážitky",
    wlName: "Jméno",
    wlEmail: "E-mail",
    wlIco: "IČO",
    wlIcoOpt: "(nepovinné)",
    wlSubmit: "Připojit se na waitlist",
    wlSubmitting: "Odesílám...",
    wlSuccess: "Jsi na seznamu!",
    wlSuccessDesc: "Ozveme se ti, jakmile spustíme early access.",
    wlSpam: "Žádný spam. Odhlásit se můžeš kdykoliv.",
    wlErrName: "Vyplňte prosím jméno.",
    wlErrEmail: "Zadejte platný e-mail.",
    wlErrRole: "Vyberte alespoň jednu roli.",

    // Job Form
    jfTitle1: "Pošli nám",
    jfHighlight: "přihlášku",
    jfSub: "Zaujala tě některá z pozic? Vyplň formulář a my se ti ozveme.",
    jfName: "Jméno",
    jfEmail: "E-mail",
    jfPosition: "Pozice",
    jfPositionPlaceholder: "Vyber pozici",
    jfPosAmbassador: "Ambasador",
    jfPosSocial: "Social Media Manager",
    jfPosOther: "Jiná pozice",
    jfPortfolio: "Portfolio / LinkedIn",
    jfPortfolioOpt: "(nepovinné)",
    jfAbout: "O tobě",
    jfSubmit: "Odeslat přihlášku",
    jfSubmitting: "Odesílám...",
    jfSuccess: "Přihláška odeslána!",
    jfSuccessDesc: "Díky za zájem. Ozveme se ti co nejdříve.",
    jfErrName: "Vyplňte prosím jméno.",
    jfErrEmail: "Zadejte platný e-mail.",
    jfErrPos: "Vyberte pozici, o kterou máte zájem.",
    jfErrMsg: "Napište nám něco o sobě.",
    jfAboutPlaceholder: "Řekni nám něco o sobě, svých zkušenostech a proč tě Heatmapa zajímá...",

    // About Us Marquee
    aboutUsTitle1: "O",
    aboutUsHighlight: "nás",
    aboutUsText: "Heatmapa je český startup, který mění způsob, jakým lidé objevují svá města. Věříme, že každé místo má příběh a každá akce si zaslouží publikum. Naše živá mapa propojuje místní podniky, organizátory akcí a zvědavé průzkumníky v reálném čase.",
    mq1: "Živá mapa",
    mq2: "Místní podniky",
    mq3: "Události",
    mq4: "Komunita",
    mq5: "Objevování",
    mq6: "Reálný čas",
    mq7: "Heat zóny",
    mq8: "Propojení",
    mq9: "Město",
    mq10: "Zážitky",

    // Layout
    back: "Zpět",
    footer: "heatmapa s.r.o. Všechna práva vyhrazena.",
  },
  en: {
    // Hero
    heroTitle1: "Discover what's",
    heroHighlight: "happening",
    heroTitle2: "around you",
    heroSub: "Local businesses and real-time events on a live map.",
    heroWaitlist: "Join the Waitlist",
    heroLearn: "Learn More",

    // About
    aboutTitle1: "Your city,",
    aboutHighlight: "alive",
    aboutTitle2: "on a map",
    aboutSub: "Everything happening around you — hidden gems, buzzing events — all in one living, breathing map.",
    feat1Title: "Live Business Map",
    feat1Desc: "Browse restaurants, shops, and more — all updated in real time on an interactive map.",
    feat2Title: "Real-Time Events",
    feat2Desc: "Concerts, pop-ups, markets — discover events the moment they appear nearby.",
    feat3Title: "Heat Zones",
    feat3Desc: "See where the crowd is. Activity density visualized so you find the energy fast.",
    feat4Title: "Instant Updates",
    feat4Desc: "No refresh needed. The map evolves live as things open, start, and change.",

    // JoinUs
    joinTitle1: "Who is",
    joinHighlight: "Heatmapa",
    joinTitle2: "for?",
    joinSub: "Whether you run a business, host events, or love exploring — Heatmapa was built for you.",
    role1Title: "Business Owner",
    role1Desc: "Get discovered by people actively looking for places nearby — right now.",
    role2Title: "Event Organizer",
    role2Desc: "Reach locals when it matters most — as your event is happening.",
    role3Title: "Explorer",
    role3Desc: "Find the best spots and events without endless social media scrolling.",
    joinCta: "Get Early Access",

    // JoinTeam
    teamTitle1: "Join our",
    teamHighlight: "team",
    teamSub: "We're a small startup with big ambitions. Join early and help shape how people discover their city.",
    pos1Title: "Ambassador",
    pos1Type: "Part-time · Remote",
    pos1Desc: "Represent Heatmapa in your city. Connect with local businesses, spread the word at events, and help us grow community by community.",
    pos1Perks: ["Flexible schedule", "Early access", "Commission-based"],
    pos2Title: "Social Media Manager",
    pos2Type: "Part-time · Remote",
    pos2Desc: "Own our social presence. Create engaging content, build our audience, and tell the Heatmapa story across Instagram, TikTok, and X.",
    pos2Perks: ["Creative freedom", "Equity options", "Growth role"],
    applyCta: "Apply Now",

    // Waitlist Form
    wlTitle1: "Be the first",
    wlHighlight: "on the map",
    wlSub: "Sign up for the waitlist and get access before everyone else.",
    wlWho: "Who are you?",
    wlRole1: "Event Creator",
    wlRole1Desc: "I organize events and activities",
    wlRole2: "Business Owner",
    wlRole2Desc: "I own a business / venue",
    wlRole3: "Explorer",
    wlRole3Desc: "I discover new places and experiences",
    wlName: "Name",
    wlEmail: "Email",
    wlIco: "Company ID",
    wlIcoOpt: "(optional)",
    wlSubmit: "Join the Waitlist",
    wlSubmitting: "Submitting...",
    wlSuccess: "You're on the list!",
    wlSuccessDesc: "We'll reach out as soon as we launch early access.",
    wlSpam: "No spam. Unsubscribe anytime.",
    wlErrName: "Please enter your name.",
    wlErrEmail: "Please enter a valid email.",
    wlErrRole: "Please select at least one role.",

    // Job Form
    jfTitle1: "Send us your",
    jfHighlight: "application",
    jfSub: "Interested in a position? Fill out the form and we'll get in touch.",
    jfName: "Name",
    jfEmail: "Email",
    jfPosition: "Position",
    jfPositionPlaceholder: "Select a position",
    jfPosAmbassador: "Ambassador",
    jfPosSocial: "Social Media Manager",
    jfPosOther: "Other position",
    jfPortfolio: "Portfolio / LinkedIn",
    jfPortfolioOpt: "(optional)",
    jfAbout: "About you",
    jfSubmit: "Submit Application",
    jfSubmitting: "Submitting...",
    jfSuccess: "Application sent!",
    jfSuccessDesc: "Thanks for your interest. We'll be in touch soon.",
    jfErrName: "Please enter your name.",
    jfErrEmail: "Please enter a valid email.",
    jfErrPos: "Please select a position.",
    jfErrMsg: "Please tell us about yourself.",
    jfAboutPlaceholder: "Tell us about yourself, your experience, and why Heatmapa interests you...",

    // About Us Marquee
    aboutUsTitle1: "About",
    aboutUsHighlight: "us",
    aboutUsText: "Heatmapa is a Czech startup changing how people discover their cities. We believe every place has a story and every event deserves an audience. Our live map connects local businesses, event organizers, and curious explorers in real time.",
    mq1: "Live Map",
    mq2: "Local Businesses",
    mq3: "Events",
    mq4: "Community",
    mq5: "Discovery",
    mq6: "Real-Time",
    mq7: "Heat Zones",
    mq8: "Connection",
    mq9: "City",
    mq10: "Experiences",

    // Layout
    back: "Back",
    footer: "heatmapa s.r.o. All rights reserved.",
  },
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState("cs");
  const t = translations[lang];
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
