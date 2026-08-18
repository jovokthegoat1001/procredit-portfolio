const { useState, useEffect, useRef } = React;

// TODO once the Edge Functions are deployed: replace these two with
// `${SUPABASE_URL}/functions/v1/send-otp` and `.../verify-otp`. Kept as two
// separate constants (rather than one base + path) because during local
// testing each function runs on its own port.
const SEND_OTP_URL = "http://localhost:8000";
const VERIFY_OTP_URL = "http://localhost:8001";

const SESSION_KEY = "pc_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.email || !s.expiresAt || Date.now() > s.expiresAt) return null;
    return s;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function Login({ onSuccess }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  function startCooldown() {
    setCooldown(30);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function sendCode(e) {
    if (e) e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@procredit.ph")) {
      setError("Please use your procredit.ph email address");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch(SEND_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setEmail(trimmed);
      setStep("code");
      startCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    if (code.trim().length !== 6) { setError("Enter the 6-digit code"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email, expiresAt: Date.now() + SESSION_TTL_MS }));
      onSuccess(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <style>{`
        .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #0f0f13; font-family: "IBM Plex Sans", system-ui, sans-serif; }
        .login-card { width: 100%; max-width: 380px; padding: 40px 36px; border-radius: 22px;
          background: #1a1a20; border: 1px solid rgba(255,255,255,.09);
          box-shadow: 0 30px 80px -16px rgba(0,0,0,.7); }
        .login-logo { height: 30px; width: auto; filter: brightness(0) invert(1); margin-bottom: 28px; display: block; }
        .login-h1 { font-size: 20px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.02em; margin: 0; }
        .login-sub { font-size: 13px; color: #9596a1; margin: 8px 0 24px; line-height: 1.5; }
        .login-sub b { color: #c3c3cc; font-weight: 600; }
        .login-field { width: 100%; padding: 12px 14px; border-radius: 11px; border: 1px solid rgba(255,255,255,.09);
          background: #23232b; color: #f5f5f7; font-size: 14px; font-family: inherit; outline: none;
          transition: border-color .14s; box-sizing: border-box; }
        .login-field:focus { border-color: #3a8fc7; }
        .login-field.code { letter-spacing: .3em; font-family: "IBM Plex Mono", monospace; font-size: 18px; text-align: center; }
        .login-btn { width: 100%; margin-top: 14px; padding: 12px 16px; border-radius: 11px; border: none;
          background: #3a8fc7; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background .14s, opacity .14s; }
        .login-btn:hover:not(:disabled) { background: #2f78a8; }
        .login-btn:disabled { opacity: .55; cursor: default; }
        .login-error { font-size: 12.5px; color: #ff6b6b; margin-top: 12px; }
        .login-links { display: flex; justify-content: space-between; margin-top: 18px; font-size: 12.5px; }
        .login-link { background: none; border: none; color: #74757f; cursor: pointer; font-size: 12.5px; padding: 0; }
        .login-link:hover:not(:disabled) { color: #c3c3cc; }
        .login-link:disabled { opacity: .5; cursor: default; }
      `}</style>
      <div className="login-card">
        <img src="procredit-logo.png" alt="ProCredit" className="login-logo" />
        {step === "email" ? (
          <form onSubmit={sendCode}>
            <h1 className="login-h1">Sign in</h1>
            <p className="login-sub">Enter your ProCredit email to receive a one-time login code.</p>
            <input
              className="login-field"
              type="email"
              placeholder="you@procredit.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <h1 className="login-h1">Enter your code</h1>
            <p className="login-sub">We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
            <input
              className="login-field code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify"}
            </button>
            <div className="login-links">
              <button type="button" className="login-link" onClick={() => { setStep("email"); setCode(""); setError(""); }}>
                ← Use a different email
              </button>
              <button type="button" className="login-link" disabled={cooldown > 0 || loading} onClick={sendCode}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
