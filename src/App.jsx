import { Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import About from "./components/About";
import JoinUs from "./components/JoinUs";
import JoinTeam from "./components/JoinTeam";
import LogoSection from "./components/LogoSection";
import LangSwitcher from "./components/LangSwitcher";
import FormPageLayout from "./components/FormPageLayout";
import WaitlistForm from "./components/WaitlistForm";
import JobApplicationForm from "./components/JobApplicationForm";
import PrivacyPolicy from "./components/PrivacyPolicy";
import EventDetail from "./components/EventDetail";

function LandingPage() {
  return (
    <>
      <Hero />
      <About />
      <JoinUs />
      <JoinTeam />
      <LogoSection />
    </>
  );
}

function FormRoute({ children }) {
  return <FormPageLayout>{children}</FormPageLayout>;
}

export default function App() {
  return (
    <>
      <LangSwitcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/waitlist" element={<FormRoute><WaitlistForm /></FormRoute>} />
        <Route path="/partners" element={<FormRoute><JobApplicationForm /></FormRoute>} />
        <Route path="/privacy" element={<FormRoute><PrivacyPolicy /></FormRoute>} />
        <Route path="/event/:id" element={<FormRoute><EventDetail /></FormRoute>} />
      </Routes>
    </>
  );
}
