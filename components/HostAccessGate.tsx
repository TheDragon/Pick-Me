"use client";

import { FormEvent, useEffect, useState } from "react";

import { HostClient } from "@/components/HostClient";

const HOST_ACCESS_KEY = "pickme.host.access";
const DEFAULT_HOST_PASSWORD = "hostpickme";
const HOST_PASSWORD = process.env.NEXT_PUBLIC_HOST_PASSWORD ?? DEFAULT_HOST_PASSWORD;
const SHOW_DEFAULT_HINT = !process.env.NEXT_PUBLIC_HOST_PASSWORD;

export function HostAccessGate() {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const storedAccess = window.sessionStorage.getItem(HOST_ACCESS_KEY);
    setIsAuthorized(storedAccess === "granted");
    setIsReady(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.trim() !== HOST_PASSWORD) {
      setErrorMessage("Incorrect password.");
      return;
    }

    window.sessionStorage.setItem(HOST_ACCESS_KEY, "granted");
    setIsAuthorized(true);
    setErrorMessage("");
    setPassword("");
  }

  function handleLock() {
    window.sessionStorage.removeItem(HOST_ACCESS_KEY);
    setIsAuthorized(false);
    setPassword("");
    setErrorMessage("");
  }

  if (!isReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 md:px-8">
        <div className="rounded-2xl border border-border bg-panel/80 px-6 py-5 text-sm text-slate-300">Loading host access...</div>
      </main>
    );
  }

  if (isAuthorized) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50">
          <button type="button" onClick={handleLock} className="rounded-lg border border-border bg-slate-900/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-warning hover:text-warning">
            Lock Host
          </button>
        </div>
        <HostClient />
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 md:px-8">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface/90 p-6 shadow-2xl shadow-black/30 md:p-8">
        <header className="space-y-1 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Host Access</h1>
          <p className="text-sm text-slate-300">Enter password to open the host dashboard.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="hostPassword" className="text-sm text-slate-300">
              Password
            </label>
            <input id="hostPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent" />
          </div>

          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:bg-accentSoft">
            Enter Host Page
          </button>
        </form>

        {errorMessage ? <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p> : null}

        {SHOW_DEFAULT_HINT ? <p className="text-center text-xs text-slate-500"></p> : null}
      </div>
    </main>
  );
}
