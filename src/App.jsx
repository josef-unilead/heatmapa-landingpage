import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
// Pozor: /react, ne /next – tohle je Vite SPA. Komponenta si sama odchytává
// změny historie, takže se počítají i přechody mezi routami react-routeru.
import { Analytics } from "@vercel/analytics/react";
import Hero from "./components/Hero";
import About from "./components/About";
import JoinUs from "./components/JoinUs";
import JoinTeam from "./components/JoinTeam";
import Partners from "./components/Partners";
import LogoSection from "./components/LogoSection";
import MapboxSection from "./components/MapboxSection";
import LangSwitcher from "./components/LangSwitcher";
import FormPageLayout from "./components/FormPageLayout";
import WaitlistForm from "./components/WaitlistForm";
import JobApplicationForm from "./components/JobApplicationForm";
import SupportForm from "./components/SupportForm";
import PrivacyPolicy from "./components/PrivacyPolicy";
import LegalDocs from "./components/LegalDocs";
import ErrorBoundary from "./components/ErrorBoundary";
import EventSection from "./components/event/EventSection";
import EventPage from "./components/event/EventPage";
import ConfirmPage from "./components/event/ConfirmPage";

// Vstupenka si nese knihovnu na kreslení QR kódu, kterou nikde jinde na webu
// nepotřebujeme. Načte se až když na ni někdo přijde.
const TicketPage = lazy(() => import("./components/event/TicketPage"));

// Administraci otevře pár lidí, nemá smysl ji tahat do bundlu všem ostatním.
const AdminPage = lazy(() => import("./components/admin/AdminPage"));

function LandingPage() {
  return (
    <>
      <Hero />
      <EventSection />
      <About />
      <JoinUs />
      <MapboxSection />
      <JoinTeam />
      <Partners />
      <LogoSection />
    </>
  );
}

function FormRoute({ children }) {
  return <FormPageLayout>{children}</FormPageLayout>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <LangSwitcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/waitlist" element={<FormRoute><WaitlistForm /></FormRoute>} />
        <Route path="/partners" element={<FormRoute><JobApplicationForm /></FormRoute>} />
        <Route path="/support" element={<FormRoute><SupportForm /></FormRoute>} />
        <Route path="/privacy" element={<FormRoute><PrivacyPolicy /></FormRoute>} />
        <Route path="/termsofuse" element={<FormRoute><LegalDocs type="terms" /></FormRoute>} />
        <Route path="/privacypolicy" element={<FormRoute><LegalDocs type="privacy" /></FormRoute>} />

        {/* Guestlist na akce */}
        <Route path="/akce/:slug" element={<FormRoute><EventPage /></FormRoute>} />
        <Route path="/rezervace/potvrdit" element={<FormRoute><ConfirmPage /></FormRoute>} />
        <Route
          path="/admin"
          element={
            <FormRoute>
              <Suspense fallback={<div className="min-h-[60vh]" />}>
                <AdminPage />
              </Suspense>
            </FormRoute>
          }
        />
        <Route
          path="/t/:token"
          element={
            <FormRoute>
              <Suspense fallback={<div className="min-h-[60vh]" />}>
                <TicketPage />
              </Suspense>
            </FormRoute>
          }
        />
      </Routes>
      <Analytics />
    </ErrorBoundary>
  );
}
