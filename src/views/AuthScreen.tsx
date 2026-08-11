/* ---------------------------------------------------------------
   Sign in / sign up.
--------------------------------------------------------------- */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Lock, Mail } from 'lucide-react'
import type { Client } from '../data/supabase'
import { ACCENT, CARD, btnBase } from '../lib/theme'
import { APP_NAME } from '../lib/defaults'
import { TimeLensMark } from '../ui/Brand'

const errText = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? "")

export function AuthScreen({
  client,
  error,
}: {
  client: Client | null
  error?: unknown
}) {
  const [mode, setMode] = useState("signin") // signin | signup
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Confirmation-link target — without this, Supabase falls back to the
  // project's configured Site URL, which for most projects is still the
  // default http://localhost:3000. Note this origin also has to be present
  // in the project's Auth > URL Configuration > Redirect URLs allow-list in
  // the Supabase dashboard, or Supabase will reject it and fall back anyway.
  const emailRedirectTo = window.location.origin

  const resendConfirmation = async () => {
    if (!client) return
    if (!email) {
      setMsg("Enter your email above, then tap resend.")
      return
    }
    setResendBusy(true)
    setMsg(null)
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      })
      if (error) throw error
      setMsg("Confirmation email sent — check your inbox.")
    } catch (err) {
      setMsg(errText(err) || "Couldn't resend the email.")
    } finally {
      setResendBusy(false)
    }
  }

  const sendReset = async () => {
    if (!client) return
    if (!email) {
      setMsg("Enter your email above, then tap reset.")
      return
    }
    setResetBusy(true)
    setMsg(null)
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: emailRedirectTo,
      })
      if (error) throw error
      // Deliberately the same message whether or not the address is
      // registered. Saying "no such account" would turn this box into a way to
      // find out who has one.
      setMsg("If that email has an account, a reset link is on its way.")
    } catch (err) {
      setMsg(errText(err) || "Couldn't send the reset email.")
    } finally {
      setResetBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client) return
    setBusy(true)
    setMsg(null)
    try {
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        })
        // Depending on Supabase's project settings, signing up again with an
        // email that's already registered but not yet confirmed either (a)
        // throws an "already registered" error, or (b) succeeds silently with
        // an empty `identities` array — either way, that's not a new account,
        // it's someone who needs a fresh confirmation email (e.g. because an
        // earlier one had a bad link). Treat both the same: explicitly resend.
        const alreadyRegisteredError =
          error &&
          /already registered|already exists/i.test(error.message || "")
        const alreadyPendingConfirmation =
          !error &&
          data?.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        if (alreadyRegisteredError || alreadyPendingConfirmation) {
          const { error: resendError } = await client.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo },
          })
          if (resendError) throw resendError
          setMsg(
            "This email is already registered but not confirmed yet — we've sent a fresh confirmation email.",
          )
          return
        }
        if (error) throw error
        setMsg(
          "Account created — check your inbox to confirm your email, then sign in.",
        )
      }
    } catch (err) {
      const notConfirmed = /email not confirmed/i.test(errText(err))
      setMsg(
        notConfirmed
          ? "Your email isn't confirmed yet — use \"Didn't get the email? Resend it\" below."
          : errText(err) || "Something went wrong.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1E2A33] flex items-center justify-center p-4">
      <div className={`${CARD} w-full max-w-sm p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#1E2A33] flex items-center justify-center">
            <TimeLensMark size={18} className="text-[#F4F5F7]" />
          </div>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-lg">
            {APP_NAME}
          </h1>
        </div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#1E2A33]/45 mb-5">
          {mode === "signin"
            ? "Sign in to your logbook"
            : "Create your logbook"}
        </p>

        {error ? (
          <p className="text-[11px] font-mono text-[#C1595B] mb-3">
            Cloud sync failed to load ({errText(error)}). Check your Supabase
            setup.
          </p>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Mail size={11} /> Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Lock size={11} /> Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>

          {msg && (
            <p className="text-[11px] font-mono text-[#1E2A33]/70">{msg}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ backgroundColor: ACCENT }}
            className={`${btnBase} w-full text-white text-xs font-mono uppercase tracking-widest px-3 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50`}
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin")
            setMsg(null)
          }}
          className={`${btnBase} mt-4 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33]`}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        <button
          onClick={resendConfirmation}
          disabled={resendBusy}
          className={`${btnBase} mt-2 block text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33] disabled:opacity-50`}
        >
          {resendBusy ? "Sending…" : "Didn't get the email? Resend it"}
        </button>

        {mode === "signin" && (
          <button
            onClick={sendReset}
            disabled={resetBusy}
            className={`${btnBase} mt-2 block text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33] disabled:opacity-50`}
          >
            {resetBusy ? "Sending…" : "Forgot your password? Reset it"}
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------
   Setting a new password.

   Shown instead of the logbook when the app was opened from a reset link. The
   link carries a real session, which is what makes `updateUser` work here
   without the old password — and also why this screen has to exist: without
   it the app would just open, signed in, and never ask.
--------------------------------------------------------------- */

export function SetPasswordScreen({
  client,
  onDone,
}: {
  client: Client | null
  /** Clears the recovery flag so the app falls through to the logbook. */
  onDone: () => void
}) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client) return
    if (password !== confirm) {
      setMsg("The two passwords don't match.")
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw error
      // The recovery session is already a signed-in one, so there is nothing
      // left to do but get out of the way.
      onDone()
    } catch (err) {
      setMsg(errText(err) || "Couldn't set the password.")
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1E2A33] flex items-center justify-center p-4">
      <div className={`${CARD} w-full max-w-sm p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#1E2A33] flex items-center justify-center">
            <TimeLensMark size={18} className="text-[#F4F5F7]" />
          </div>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-lg">
            {APP_NAME}
          </h1>
        </div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#1E2A33]/45 mb-5">
          Choose a new password
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Lock size={11} /> New password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Lock size={11} /> Repeat it
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>

          {msg && (
            <p className="text-[11px] font-mono text-[#C1595B]">{msg}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ backgroundColor: ACCENT }}
            className={`${btnBase} w-full text-white text-xs font-mono uppercase tracking-widest px-3 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50`}
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>

        {/* An escape hatch for landing here by accident — the link already
            signed you in, so skipping just means keeping the old password. */}
        <button
          onClick={onDone}
          className={`${btnBase} mt-4 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33]`}
        >
          Skip — keep my current password
        </button>
      </div>
    </div>
  )
}
