import { Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import About from "./components/About";
import JoinUs from "./components/JoinUs";
import JoinTeam from "./components/JoinTeam";
import WaitlistForm from "./components/WaitlistForm";
import JobApplicationForm from "./components/JobApplicationForm";
import FormPageLayout from "./components/FormPageLayout";
import LangSwitcher from "./components/LangSwitcher";
import AboutMarquee from "./components/AboutMarquee";
import { useLang } from "./lib/i18n";

function LandingPage() {
  const { t } = useLang();
  return (
    <>
      <Hero />
      <About />
      <JoinUs />
      <JoinTeam />
      <AboutMarquee />
      <footer className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
          <img
            src="/heatmapa-wordmark.svg"
            alt="heatmapa"
            className="h-6 opacity-30"
          />
          <p className="text-xs tracking-wide text-neutral-600">
            &copy; {new Date().getFullYear()} {t.footer}
          </p>
          <p className="text-xs tracking-wide text-neutral-700">
            IČO: 244 19 010
          </p>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <>
      <LangSwitcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/waitlist"
          element={
            <FormPageLayout>
              <WaitlistForm />
            </FormPageLayout>
          }
        />
        <Route
          path="/jobform"
          element={
            <FormPageLayout>
              <JobApplicationForm />
            </FormPageLayout>
          }
        />
      </Routes>
    </>
  );
}
