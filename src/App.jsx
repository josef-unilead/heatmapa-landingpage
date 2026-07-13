import { Routes, Route } from "react-router-dom";
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
import PrivacyPolicy from "./components/PrivacyPolicy";
import ErrorBoundary from "./components/ErrorBoundary";

function LandingPage() {
  return (
    <>
      <Hero />
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
        <Route path="/privacy" element={<FormRoute><PrivacyPolicy /></FormRoute>} />
      </Routes>
    </ErrorBoundary>
  );
}
