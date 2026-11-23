"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { OtpField } from "@/components/ui/otp-field";
import { TextField } from "@/components/ui/text-field";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, isValidEmail, normaliseEmail, safeNext } from "./auth-helpers";

// O1 · Sign in and O1 · Email code (Figma "Screens / Admin Dashboard", approved 22 Nov 2026).
// Mobile: content top, action area pinned to the bottom. Desktop ≥1024: form side + image side.
type Step = "email" | "code";

export function SignInFlow({ next, linkFailed }: { next?: string; linkFailed?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(
    linkFailed ? "This sign-in link has expired or was opened in another browser. Send a new code." : undefined,
  );
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function sendCode(): Promise<boolean> {
    const address = normaliseEmail(email);
    if (!isValidEmail(address)) {
      setError("Enter your email, like kofi@akomaevents.com");
      return false;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Sign-in is not set up yet. Try again later.");
      return false;
    }
    setBusy(true);
    setError(undefined);
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", safeNext(next));
    const { error: e } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, emailRedirectTo: callback.toString() },
    });
    setBusy(false);
    if (e) {
      setError(authErrorMessage(e));
      return false;
    }
    setEmail(address);
    setCode("");
    setStep("code");
    return true;
  }

  async function verify(token = code) {
    if (token.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    const { error: e } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (e) {
      setBusy(false);
      setError(authErrorMessage(e));
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  async function resend() {
    setNotice(undefined);
    if (await sendCode()) setNotice("New code sent. Check your email.");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    void (step === "email" ? sendCode() : verify());
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-dvh flex-col lg:flex-row">
      <div className="flex flex-1 flex-col lg:px-[120px] lg:pt-12">
        {/* Mobile header: wordmark on the email step, back button on the code step. Desktop: wordmark. */}
        {step === "email" ? (
          <header className="flex h-16 items-center px-6 lg:h-auto lg:px-0">
            <Wordmark />
          </header>
        ) : (
          <header className="flex h-14 items-center px-5 lg:h-auto lg:px-0">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(undefined);
                setNotice(undefined);
              }}
              aria-label="Back to email"
              className="-ml-2 grid size-10 place-items-center rounded-sm text-fg hover:bg-subtle lg:hidden"
            >
              <Icon name="chevron-left" />
            </button>
            <Wordmark className="hidden lg:inline-flex" />
          </header>
        )}

        <div className="flex flex-1 flex-col lg:justify-center">
          <div className="flex w-full flex-col gap-5 px-6 pt-2 pb-[180px] lg:w-[400px] lg:gap-6 lg:px-0 lg:pt-0 lg:pb-12">
            <div className="flex flex-col gap-2">
              <h1 className="vx-heading-xl text-fg">{step === "email" ? "Sign in" : "Check your email"}</h1>
              <p className="vx-body-lg text-muted">
                {step === "email" ? (
                  "Use your work email. We will send you a code, no password needed."
                ) : (
                  <>
                    We sent a 6-digit code to <span className="text-fg">{email}</span>.
                  </>
                )}
              </p>
            </div>

            {step === "email" ? (
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                placeholder="kofi@akomaevents.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />
            ) : (
              <OtpField
                label="6-digit code"
                value={code}
                onChange={(next) => {
                  setCode(next);
                  // Check the code as soon as the sixth digit is typed or pasted; the button stays as a fallback.
                  if (next.length === 6 && next !== code && !busy) void verify(next);
                }}
                error={error}
                autoFocus
              />
            )}

            {notice ? (
              <p role="status" className="vx-body-md text-muted">
                {notice}
              </p>
            ) : null}

            {/* Action area: pinned bottom on phones and tablets, inline under the form on desktop. */}
            <div className="fixed inset-x-0 bottom-0 flex flex-col gap-1 border-t border-border bg-bg px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:p-0">
              <Button type="submit" block busy={busy}>
                {step === "email" ? "Send code" : "Continue"}
              </Button>
              <div className="flex h-11 items-center justify-center lg:mt-5 lg:h-auto lg:justify-start">
                {step === "email" ? (
                  <button
                    type="submit"
                    className="vx-body-md-medium text-fg underline-offset-4 hover:underline"
                    disabled={busy}
                  >
                    <span className="lg:hidden">Create an account</span>
                    <span className="hidden lg:inline">New here? Create an account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void resend()}
                    disabled={busy}
                    className="vx-body-md-medium text-fg underline-offset-4 hover:underline"
                  >
                    Send a new code
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlatformImage />
    </form>
  );
}

// Desktop image side. Decided 22 Nov 2026: shows the Votex platform, not an event. The platform image is
// still to be designed and approved in Figma, so this keeps the slot and caption without a stand-in photo.
function PlatformImage() {
  return (
    <aside aria-hidden className="relative hidden w-[560px] shrink-0 bg-subtle lg:block">
      <div className="absolute bottom-[45px] left-8 flex flex-col gap-0.5 rounded-md bg-bg px-5 py-4">
        <p className="vx-body-md-strong text-fg">Run voting, tickets and elections</p>
        <p className="vx-caption text-muted">Mobile money, live results and payouts in one place.</p>
      </div>
    </aside>
  );
}
