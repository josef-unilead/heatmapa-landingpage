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
    aboutSub: "Vše co se děje kolem vás — aktuální eventy, personalizované nabídky podniků a vaši přátelé na jedné mapě.",
    feat1Title: "Podniky v okolí",
    feat1Desc: "Kavárny, restaurace, kluby i večerky na mapě. Exkluzivní slevy pouze v aplikaci heatmapa.",
    feat2Title: "Události v reálném čase",
    feat2Desc: "Zapněte si notifikace a dostávejte upozornění na události ve vašem okolí přizpůsobené vašim zájmům.",
    feat3Title: "Heat zóny",
    feat3Desc: "Zjistěte kde to ve městě žije. Objevujte oblíbená místa, skryté klenoty a lokální hangout spoty.",
    feat4Title: "Vaši přátelé",
    feat4Desc: "Sledujte kamarády na mapě a pozvěte je přímo v aplikaci na sraz do oblíbeného podniku nebo na nejbližší akci.",

    // JoinUs
    joinTitle1: "Pro koho je",
    joinHighlight: "Heatmapa",
    joinTitle2: "?",
    joinSub: "Vlastníte podnik, pořádáte akce, nebo rádi objevujete nová místa ve městě? Vyzkoušejte aplikaci heatmapa zdarma!",
    role1Title: "Majitel podniku",
    role1Desc: "Buďte objeveni lidmi poblíž. Oslovte nové zákazníky cílenou propagací podle jejich zájmů.",
    role2Title: "Pořadatel akcí",
    role2Desc: "Zvýrazněte událost na mapě a v reálném čase oslovte uživatele, kteří se rozhodují právě teď.",
    role3Title: "Objevovatel",
    role3Desc: "Najděte nejlepší místa a události v okolí a sledujte kamarády na mapě.",
    joinCta: "Získat early access",

    // JoinTeam
    teamTitle1: "Přidejte se k",
    teamHighlight: "týmu",
    teamSub: "Jsme český startup s velkými ambicemi. Přidejte se k nám a pomozte změnit způsob, jakým lidé objevují města.",
    posTitle: "Ambasador & Social Media Manager",
    posType: "Part-time · Remote",
    posDesc: "Reprezentujte Heatmapu ve svém městě a na sociálních sítích. Spojte se s místními podniky, tvořte obsah, šiřte slovo na akcích a pomozte nám růst komunitu po komunitě.",
    posPerks: ["Flexibilní rozvrh", "Early access"],
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
    wlErrIco: "IČO musí obsahovat pouze čísla.",
    wlErrRole: "Vyberte alespoň jednu roli.",
    wlErrRate: "Počkejte chvíli před dalším odesláním.",
    wlErrDuplicate: "Tento e-mail je už na waitlistu.",
    wlErrGeneral: "Něco se pokazilo. Zkuste to znovu.",

    // Job Form
    jfTitle1: "Pošli nám",
    jfHighlight: "přihlášku",
    jfSub: "Zaujala tě některá z pozic? Vyplň formulář a my se ti ozveme.",
    jfName: "Jméno",
    jfEmail: "E-mail",
    jfPosition: "Pozice",
    jfPositionPlaceholder: "Vyber pozici",
    jfPosAmbassador: "Ambasador & Social Media",
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
    jfErrRate: "Počkejte chvíli před dalším odesláním.",
    jfErrGeneral: "Něco se pokazilo. Zkuste to znovu.",
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

    // GDPR
    gdprConsent: "Souhlasím se",
    gdprLink: "zpracováním osobních údajů",
    gdprError: "Pro odeslání musíte souhlasit se zpracováním osobních údajů.",

    // Privacy Policy
    privacyTitle: "Zásady zpracování osobních údajů",
    priv1Title: "1. Správce osobních údajů",
    priv1Text: "Správcem osobních údajů je společnost heatmapa s.r.o., IČO: 244 19 010 (dále jen „Správce"). S dotazy ohledně zpracování osobních údajů se na nás můžete obrátit na e-mailu info@heatmapa.cz.",
    priv2Title: "2. Jaké údaje zpracováváme",
    priv2Text: "Zpracováváme údaje, které nám dobrovolně poskytnete prostřednictvím formulářů na těchto stránkách: jméno, e-mailovou adresu, IČO (volitelně), zvolenou roli/pozici, portfolio odkaz a zprávu o sobě. Tyto údaje jsou nezbytné pro zařazení na waitlist nebo zpracování pracovní přihlášky.",
    priv3Title: "3. Účel zpracování",
    priv3Text: "Vaše údaje zpracováváme za účelem: (a) zařazení na waitlist a informování o spuštění služby heatmapa, (b) zpracování pracovních přihlášek a kontaktování uchazečů, (c) komunikace související s těmito účely.",
    priv4Title: "4. Právní základ zpracování",
    priv4Text: "Osobní údaje zpracováváme na základě vašeho souhlasu, který udělujete zaškrtnutím příslušného pole ve formuláři. Tento souhlas můžete kdykoli odvolat zasláním e-mailu na info@heatmapa.cz.",
    priv5Title: "5. Doba zpracování",
    priv5Text: "Údaje z waitlistu uchováváme po dobu trvání waitlistu a následně maximálně 12 měsíců po spuštění služby. Údaje z pracovních přihlášek uchováváme po dobu výběrového řízení a následně maximálně 6 měsíců pro případné budoucí nabídky, pokud s tím vyjádříte souhlas.",
    priv6Title: "6. Vaše práva",
    priv6Text: "Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost údajů a právo vznést námitku proti zpracování. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).",
    priv7Title: "7. Zabezpečení údajů",
    priv7Text: "Vaše údaje jsou uloženy v zabezpečené databázi s šifrovaným přenosem dat. Přístup k údajům mají pouze oprávněné osoby Správce. Údaje nepředáváme třetím stranám s výjimkou poskytovatelů technické infrastruktury nezbytné pro provoz služby.",
    privLastUpdate: "Poslední aktualizace: březen 2026",

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
    posTitle: "Ambassador & Social Media Manager",
    posType: "Part-time · Remote",
    posDesc: "Represent Heatmapa in your city and on social media. Connect with local businesses, create content, spread the word at events, and help us grow community by community.",
    posPerks: ["Flexible schedule", "Early access"],
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
    wlErrIco: "Company ID must contain only numbers.",
    wlErrRole: "Please select at least one role.",
    wlErrRate: "Please wait a moment before submitting again.",
    wlErrDuplicate: "This email is already on the waitlist.",
    wlErrGeneral: "Something went wrong. Please try again.",

    // Job Form
    jfTitle1: "Send us your",
    jfHighlight: "application",
    jfSub: "Interested in a position? Fill out the form and we'll get in touch.",
    jfName: "Name",
    jfEmail: "Email",
    jfPosition: "Position",
    jfPositionPlaceholder: "Select a position",
    jfPosAmbassador: "Ambassador & Social Media",
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
    jfErrRate: "Please wait a moment before submitting again.",
    jfErrGeneral: "Something went wrong. Please try again.",
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

    // GDPR
    gdprConsent: "I agree to the",
    gdprLink: "processing of personal data",
    gdprError: "You must agree to the processing of personal data to submit.",

    // Privacy Policy
    privacyTitle: "Privacy Policy",
    priv1Title: "1. Data Controller",
    priv1Text: "The data controller is heatmapa s.r.o., Company ID: 244 19 010 (hereinafter \"Controller\"). For questions regarding the processing of personal data, please contact us at info@heatmapa.cz.",
    priv2Title: "2. What Data We Process",
    priv2Text: "We process the data you voluntarily provide through the forms on this website: name, email address, Company ID (optional), selected role/position, portfolio link, and a message about yourself. This data is necessary for waitlist enrollment or processing job applications.",
    priv3Title: "3. Purpose of Processing",
    priv3Text: "We process your data for the purposes of: (a) enrolling you on the waitlist and informing you about the launch of the heatmapa service, (b) processing job applications and contacting applicants, (c) communication related to these purposes.",
    priv4Title: "4. Legal Basis",
    priv4Text: "We process personal data based on your consent, which you grant by checking the relevant box in the form. You may withdraw this consent at any time by sending an email to info@heatmapa.cz.",
    priv5Title: "5. Data Retention Period",
    priv5Text: "Waitlist data is retained for the duration of the waitlist and for a maximum of 12 months after the service launch. Job application data is retained for the duration of the recruitment process and for a maximum of 6 months for potential future offers, if you consent.",
    priv6Title: "6. Your Rights",
    priv6Text: "You have the right to access, rectify, erase, restrict processing, data portability, and the right to object to processing. You also have the right to lodge a complaint with the Office for Personal Data Protection (www.uoou.cz).",
    priv7Title: "7. Data Security",
    priv7Text: "Your data is stored in a secure database with encrypted data transfer. Only authorized personnel of the Controller have access. We do not share data with third parties except for technical infrastructure providers necessary for service operation.",
    privLastUpdate: "Last updated: March 2026",

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
