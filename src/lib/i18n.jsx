import { createContext, useContext, useState } from "react";

const translations = {
  cs: {
    // Hero
    heroWaitlist: "Připojit se na waitlist",
    heroLearn: "Partnerství",
    heroUpcoming: "Připravujeme",
    eventViewButton: "Zobrazit",

    // About
    aboutTitle1: "Vaše město,",
    aboutHighlight: "živě",
    aboutTitle2: "na mapě",
    aboutSub: "Vše co se děje kolem vás — aktuální eventy, personalizované nabídky podniků a vaši přátelé na jedné mapě.",
    feat1Title: "Podniky v okolí",
    feat1Desc: "Kavárny, restaurace, kluby i večerky na mapě. Exkluzivní slevy pouze v aplikaci heatmapa.",
    feat2Title: "Události v reálném čase",
    feat2Desc: "Zapněte si notifikace a dostávejte upozornění na události ve vašem okolí přizpůsobené vašim zájmům.",
    feat3Title: "Personalizované notifikace",
    feat3Desc: "Notifikace vám chodí přímo od podniků a pořadatelů, takže o nových akcích a slevách ve svém okolí víte první.",
    feat4Title: "Vaši přátelé",
    feat4Desc: "Sledujte kamarády na mapě a pozvěte je přímo v aplikaci na sraz do oblíbeného podniku nebo na nejbližší akci.",

    // JoinUs
    joinTitle1: "Pro koho je",
    joinHighlight: "Heatmapa?",
    joinSub: "Vlastníte podnik, pořádáte akce, nebo rádi objevujete nová místa ve městě? Vyzkoušejte aplikaci heatmapa zdarma!",
    role1Title: "Majitel podniku",
    role1Desc: "Buďte objeveni lidmi poblíž. Oslovte nové zákazníky cílenou propagací podle jejich zájmů.",
    role2Title: "Pořadatel akcí",
    role2Desc: "Zvýrazněte událost na mapě a v reálném čase oslovte uživatele, kteří se rozhodují právě teď.",
    role3Title: "Objevovatel",
    role3Desc: "Najděte nejlepší místa a události v okolí a sledujte kamarády na mapě.",
    joinCta: "Získat early access",

    // JoinTeam (Partner)
    teamTitle1: "Staňte se naším",
    teamHighlight: "partnerem!",
    teamSub: "Spojte svou značku s mladými, kteří v reálném čase rozhodují, kam ve městě vyrazí a co vyzkouší. Buďte tam, kde se právě teď něco děje.",
    posTitle: "Zviditelněte s námi vaši značku",
    partnerOffer: "Pilot zdarma",
    posDesc: "Hledáme značky, které chtějí být u toho, co se ve městě právě teď děje. Nabízíme dlouhodobou spolupráci postavenou na společném růstu — propojíme vaši značku s mladými lidmi, kteří se v reálném čase rozhodují, kam vyrazí a co zkusí.",
    posPerks: ["značka u partnerských událostí a podniků", "Kategoriální exkluzivita", "Platforma pro partnerské podniky"],
    applyCta: "Mám zájem o spolupráci",

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
    wlErrName: "Vyplňte prosím jméno.",
    wlErrEmail: "Zadejte platný e-mail.",
    wlErrIco: "IČO musí obsahovat pouze čísla.",
    wlErrRole: "Vyberte alespoň jednu roli.",
    wlErrRate: "Počkejte chvíli před dalším odesláním.",
    wlErrDuplicate: "Tento e-mail je už na waitlistu.",
    wlErrGeneral: "Něco se pokazilo. Zkuste to znovu.",

    // Partner Inquiry Form
    jfTitle1: "Mám zájem o",
    jfHighlight: "spolupráci",
    jfSub: "Stačí pár řádků o vaší značce. Ozveme se vám s konkrétními možnostmi spolupráce.",
    jfName: "Kontaktní osoba",
    jfEmail: "E-mail",
    jfPosition: "Značka / firma",
    jfPositionPlaceholder: "Vaše značka, s.r.o.",
    jfPortfolio: "Web",
    jfPortfolioOpt: "(nepovinné)",
    jfAbout: "O vaší značce",
    jfSubmit: "Odeslat poptávku",
    jfSubmitting: "Odesílám...",
    jfSuccess: "Poptávka odeslána!",
    jfSuccessDesc: "Díky za zájem. Ozveme se vám během několika dní s konkrétními možnostmi.",
    jfErrName: "Vyplňte prosím kontaktní osobu.",
    jfErrEmail: "Zadejte platný e-mail.",
    jfErrPos: "Vyplňte název značky.",
    jfErrMsg: "Napište nám pár slov o vaší značce.",
    jfErrWebsite: "Web zadejte ve formátu www.example.cz",
    jfErrRate: "Počkejte chvíli před dalším odesláním.",
    jfErrGeneral: "Něco se pokazilo. Zkuste to znovu.",
    jfAboutPlaceholder: "Řekněte nám pár slov o vaší značce — co děláte, jakou cílovku oslovujete a jakou spolupráci si představujete...",

    // GDPR
    gdprConsent: "Souhlasím se",
    gdprLink: "zpracováním osobních údajů",
    gdprError: "Pro odeslání musíte souhlasit se zpracováním osobních údajů.",

    // Privacy Policy
    privacyTitle: "Zásady zpracování osobních údajů",
    priv1Title: "1. Správce osobních údajů",
    priv1Text: "Správcem osobních údajů je společnost heatmapa s.r.o., IČO: 244 19 010 (dále jen „Správce“). S dotazy ohledně zpracování osobních údajů se na nás můžete obrátit na e-mailu info@heatmapa.cz.",
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
  },
  en: {
    // Hero
    heroWaitlist: "Join the Waitlist",
    heroLearn: "Partnership",
    heroUpcoming: "Coming up",
    eventViewButton: "View",

    // About
    aboutTitle1: "Your city,",
    aboutHighlight: "alive",
    aboutTitle2: "on a map",
    aboutSub: "Everything happening around you — hidden gems, buzzing events — all in one living, breathing map.",
    feat1Title: "Live Business Map",
    feat1Desc: "Browse restaurants, shops, and more — all updated in real time on an interactive map.",
    feat2Title: "Real-Time Events",
    feat2Desc: "Concerts, pop-ups, markets — discover events the moment they appear nearby.",
    feat3Title: "Personalized notifications",
    feat3Desc: "Notifications come straight from businesses and event organizers, so you're the first to know about new events and deals nearby.",
    feat4Title: "Instant Updates",
    feat4Desc: "No refresh needed. The map evolves live as things open, start, and change.",

    // JoinUs
    joinTitle1: "Who is",
    joinHighlight: "Heatmapa for?",
    joinSub: "Whether you run a business, host events, or love exploring — Heatmapa was built for you.",
    role1Title: "Business Owner",
    role1Desc: "Get discovered by people actively looking for places nearby — right now.",
    role2Title: "Event Organizer",
    role2Desc: "Reach locals when it matters most — as your event is happening.",
    role3Title: "Explorer",
    role3Desc: "Find the best spots and events without endless social media scrolling.",
    joinCta: "Get Early Access",

    // JoinTeam (Partner)
    teamTitle1: "Become our",
    teamHighlight: "partner!",
    teamSub: "Connect your brand with young people deciding in real time where to go and what to try. Be where the city is buzzing right now.",
    posTitle: "Let's put your brand on the map",
    partnerOffer: "Free pilot",
    posDesc: "We're looking for brands that want to be part of what's happening in the city right now. We offer long-term partnerships built on shared growth — connecting your brand with young people who decide in real time where to go and what to try.",
    posPerks: ["Brand at partner events and venues", "Category exclusivity", "Platform for partner venues"],
    applyCta: "Let's partner up",

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
    wlErrName: "Please enter your name.",
    wlErrEmail: "Please enter a valid email.",
    wlErrIco: "Company ID must contain only numbers.",
    wlErrRole: "Please select at least one role.",
    wlErrRate: "Please wait a moment before submitting again.",
    wlErrDuplicate: "This email is already on the waitlist.",
    wlErrGeneral: "Something went wrong. Please try again.",

    // Partner Inquiry Form
    jfTitle1: "Let's talk",
    jfHighlight: "partnership",
    jfSub: "Just a few lines about your brand. We'll get back to you with concrete partnership options.",
    jfName: "Contact person",
    jfEmail: "Email",
    jfPosition: "Brand / company",
    jfPositionPlaceholder: "Your brand, Ltd.",
    jfPortfolio: "Website",
    jfPortfolioOpt: "(optional)",
    jfAbout: "About your brand",
    jfSubmit: "Send inquiry",
    jfSubmitting: "Submitting...",
    jfSuccess: "Inquiry sent!",
    jfSuccessDesc: "Thanks for reaching out. We'll be in touch within a few days with concrete options.",
    jfErrName: "Please enter a contact person.",
    jfErrEmail: "Please enter a valid email.",
    jfErrPos: "Please enter your brand name.",
    jfErrMsg: "Please tell us about your brand.",
    jfErrWebsite: "Website must be in www.example.com format",
    jfErrRate: "Please wait a moment before submitting again.",
    jfErrGeneral: "Something went wrong. Please try again.",
    jfAboutPlaceholder: "Tell us about your brand — what you do, your target audience, and what kind of partnership you have in mind...",

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
