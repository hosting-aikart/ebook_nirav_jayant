import { useState, type FormEvent } from "react";
import { ArrowIcon } from "./BookParts";
import { requestPasswordReset, resetPassword, signIn, signUp } from "../lib/account";

type Mode = "signin" | "signup" | "forgot";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordInput({
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-password">
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/**
 * Sign in / Create account / Forgot password. Used on /account and inside checkout
 * (customers must sign in before paying). Calls onDone after a successful sign-in.
 */
export function AuthForms({ initialMode = "signin", onDone }: { initialMode?: Mode; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const switchTo = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup" && !name.trim()) return setError("Please enter your name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Please enter a valid email address.");
    if (mode === "signup" && password.length < 8) return setError("Please choose a password of at least 8 characters.");
    if (mode === "signin" && !password) return setError("Please enter your password.");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await requestPasswordReset(email.trim());
        setNotice(res.message);
      } else {
        if (mode === "signup") await signUp(name.trim(), email.trim(), password);
        else await signIn(email.trim(), password);
        setPassword("");
        onDone?.();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      {mode === "forgot" ? (
        <div className="auth-forgot-head">
          <h2>Reset your password</h2>
          <p>Enter your account email and we'll send you a link to choose a new password.</p>
        </div>
      ) : (
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "is-active" : ""}
            onClick={() => switchTo("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => switchTo("signup")}
          >
            Create account
          </button>
        </div>
      )}

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <label>
            <span>Full name</span>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </label>
        )}
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
        </label>
        {mode !== "forgot" && (
          <label>
            <span className="auth-label-row">
              Password
              {mode === "signin" && (
                <button type="button" className="auth-forgot-link" onClick={() => switchTo("forgot")}>
                  Forgot password?
                </button>
              )}
            </span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              disabled={busy}
            />
            {mode === "signup" && <small>At least 8 characters.</small>}
          </label>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}

        <button className="primary-button wide-button" type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Email me a reset link"
                : "Sign in"}{" "}
          {!busy && <ArrowIcon />}
        </button>

        <p className="auth-switch">
          {mode === "signin" && (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchTo("signup")}>
                Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => switchTo("signin")}>
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => switchTo("signin")}>
              Back to sign in
            </button>
          )}
        </p>
      </form>
    </div>
  );
}

/** The page the reset email links to: /account/reset?token=… */
export function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Please choose a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await resetPassword(token, password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-forgot-head">
        <h2>Choose a new password</h2>
        <p>After saving, you'll be signed in here and signed out everywhere else.</p>
      </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>
          <span>New password</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" disabled={busy} />
          <small>At least 8 characters.</small>
        </label>
        <label>
          <span>Confirm new password</span>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" disabled={busy} />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button wide-button" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save new password"} {!busy && <ArrowIcon />}
        </button>
        <p className="auth-switch">
          <a href="/account">Back to sign in</a>
        </p>
      </form>
    </div>
  );
}
