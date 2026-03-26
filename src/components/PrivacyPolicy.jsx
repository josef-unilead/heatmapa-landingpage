import { useLang } from "../lib/i18n";

export default function PrivacyPolicy() {
  const { t } = useLang();

  return (
    <section className="px-4 py-12 md:px-6 md:py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-light tracking-wide text-neutral-300 md:text-3xl">
          {t.privacyTitle}
        </h1>
        <div className="space-y-6 text-sm leading-relaxed text-neutral-500">
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv1Title}</h2>
            <p>{t.priv1Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv2Title}</h2>
            <p>{t.priv2Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv3Title}</h2>
            <p>{t.priv3Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv4Title}</h2>
            <p>{t.priv4Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv5Title}</h2>
            <p>{t.priv5Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv6Title}</h2>
            <p>{t.priv6Text}</p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-medium text-neutral-400">{t.priv7Title}</h2>
            <p>{t.priv7Text}</p>
          </div>
          <p className="text-xs text-neutral-600">{t.privLastUpdate}</p>
        </div>
      </div>
    </section>
  );
}
