import { useState } from "react";
import { CheckCircle, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  return (
    <section id="waitlist" className="relative overflow-hidden px-6 py-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-orange-500/6 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-md text-center">
        <Badge className="mb-4">Early Access</Badge>

        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Be the first on the map
        </h2>

        <p className="mb-8 text-neutral-400">
          Join the waitlist and get early access before everyone else.
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
            <p className="text-lg font-semibold text-white">You're on the list!</p>
            <p className="mt-1 text-sm text-neutral-400">
              We'll reach out when early access opens.
            </p>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:gap-3"
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
              <Button type="submit">Join Waitlist</Button>
            </form>

            {error && (
              <p className="mt-2 text-left text-sm text-red-400">{error}</p>
            )}
            <p className="mt-4 text-xs text-neutral-600">
              No spam, ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
