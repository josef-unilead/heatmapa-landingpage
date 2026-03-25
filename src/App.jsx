import { Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import About from "./components/About";
import JoinUs from "./components/JoinUs";
import JoinTeam from "./components/JoinTeam";
import WaitlistForm from "./components/WaitlistForm";
import JobApplicationForm from "./components/JobApplicationForm";
import FormPageLayout from "./components/FormPageLayout";
import LangSwitcher from "./components/LangSwitcher";
import LogoSection from "./components/LogoSection";
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
