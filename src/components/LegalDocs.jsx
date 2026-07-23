import { FileText } from "lucide-react";
import { Card } from "./ui/card";
import { useLang } from "../lib/i18n";

const DOCS = {
  terms: {
    titleKey: "legalTermsTitle",
    versions: [
      { flag: "🇨🇿", label: "Čeština", name: "Obchodní podmínky", href: "/legal/heatmapa-obchodni-podminky.pdf", format: "PDF" },
      { flag: "🇬🇧", label: "English", name: "Terms of Use", href: "/legal/heatmapa-terms-of-use-en.pdf", format: "PDF" },
    ],
  },
  privacy: {
    titleKey: "legalPrivacyTitle",
    versions: [
      { flag: "🇨🇿", label: "Čeština", name: "Zásady zpracování osobních údajů", href: "/legal/privacypolicy-cs.html", format: "HTML" },
      { flag: "🇬🇧", label: "English", name: "Privacy Policy", href: "/legal/privacypolicy-en.html", format: "HTML" },
    ],
  },
};

export default function LegalDocs({ type }) {
  const { t } = useLang();
  const doc = DOCS[type];

  return (
    <section className="px-4 pb-24 md:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center md:mb-12">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {t[doc.titleKey]}
          </h1>
          <p className="text-base leading-7 text-neutral-400 md:text-lg">
            {t.legalChoose}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {doc.versions.map((v) => (
            <a key={v.href} href={v.href} target="_blank" rel="noopener noreferrer">
              <Card className="flex h-full flex-col items-start gap-4 rounded-4xl border border-white/10 bg-black/20 p-6 text-left transition-colors hover:border-orange-500/40 md:p-8">
                <div className="flex w-full items-center justify-between">
                  <span className="text-3xl" aria-hidden="true">{v.flag}</span>
                  <span className="rounded-full border border-orange-500/15 bg-orange-500/5 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-orange-400/90 uppercase">
                    {v.format}
                  </span>
                </div>
                <div>
                  <h2 className="mb-1 text-base font-semibold text-white">{v.label}</h2>
                  <p className="text-sm leading-relaxed text-neutral-400">{v.name}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-2 text-sm text-orange-400">
                  <FileText className="h-4 w-4" />
                  {t.legalOpen}
                </span>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
