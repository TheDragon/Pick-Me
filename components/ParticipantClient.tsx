"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

import { ParticipantJoinForm } from "@/components/ParticipantJoinForm";
import { PickButton } from "@/components/PickButton";
import { WalletConnect } from "@/components/WalletConnect";
import { ENABLE_MOCK_WALLET, SIGN_IN_MESSAGE } from "@/lib/constants";
import { formatAddress } from "@/lib/formatAddress";
import { getSocket } from "@/lib/socket";
import type { ParticipantResultPayload, SocketAck, StateUpdatePayload } from "@/lib/types";

const initialRoundState: StateUpdatePayload = {
  isPickOpen: false,
  pickOpensAt: null,
  participantsCount: 0,
  selected: [],
};

const DISPLAY_NAME_STORAGE_KEY = "pickme.displayName";
const AUTH_SESSION_STORAGE_KEY = "pickme.authSession";

type AuthMode = "wallet" | "mock";

type AuthModel = {
  mode: AuthMode | null;
  signedAddress: string;
  signature: string;
  isSignedIn: boolean;
  isSubmitting: boolean;
};

type ProfileModel = {
  displayName: string;
  joinedDisplayName: string;
  isEditingName: boolean;
};

type PresenceModel = {
  isJoined: boolean;
  joinedAddress: string;
  hasPicked: boolean;
  lastResult: ParticipantResultPayload | null;
};

type PersistedSession = {
  mode: AuthMode;
  address: string;
  signature: string;
  message: string;
  displayName: string;
};

function getStatusTone(message: string): string {
  if (message.toLowerCase().includes("selected")) {
    return "text-accent";
  }
  if (message.toLowerCase().includes("too late")) {
    return "text-warning";
  }
  if (message.toLowerCase().includes("failed") || message.toLowerCase().includes("invalid")) {
    return "text-danger";
  }
  return "text-slate-300";
}

function parsePersistedSession(rawValue: string | null): PersistedSession | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedSession>;
    if (
      (parsed.mode === "wallet" || parsed.mode === "mock") &&
      typeof parsed.address === "string" &&
      typeof parsed.signature === "string" &&
      typeof parsed.message === "string" &&
      typeof parsed.displayName === "string"
    ) {
      return {
        mode: parsed.mode,
        address: parsed.address,
        signature: parsed.signature,
        message: parsed.message,
        displayName: parsed.displayName,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function ParticipantClient() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [roundModel, setRoundModel] = useState<StateUpdatePayload>(initialRoundState);
  const [socketConnected, setSocketConnected] = useState(false);
  const [useMockWallet, setUseMockWallet] = useState(false);
  const [mockAddress, setMockAddress] = useState("");

  const [authModel, setAuthModel] = useState<AuthModel>({
    mode: null,
    signedAddress: "",
    signature: "",
    isSignedIn: false,
    isSubmitting: false,
  });

  const [profileModel, setProfileModel] = useState<ProfileModel>({
    displayName: "",
    joinedDisplayName: "",
    isEditingName: false,
  });

  const [presenceModel, setPresenceModel] = useState<PresenceModel>({
    isJoined: false,
    joinedAddress: "",
    hasPicked: false,
    lastResult: null,
  });

  const [persistedSession, setPersistedSession] = useState<PersistedSession | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pickCountdownSeconds, setPickCountdownSeconds] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Connect wallet, enter a name, then click Sign In & Join.");
  const restoreAttemptRef = useRef("");

  const currentMode: AuthMode = useMockWallet ? "mock" : "wallet";
  const currentAddress = useMockWallet ? mockAddress.trim() : (address ?? "");
  const activeAddress = presenceModel.isJoined ? presenceModel.joinedAddress : currentAddress;
  const hasIdentity =
    currentMode === "mock" ? ENABLE_MOCK_WALLET && currentAddress.length > 0 : isConnected && currentAddress.length > 0;
  const currentStep: "connect" | "join" | "pick" = !hasIdentity ? "connect" : presenceModel.isJoined ? "pick" : "join";

  const canJoin =
    profileModel.displayName.trim().length >= 2 &&
    socketConnected &&
    hasIdentity;
  const canSaveName = profileModel.displayName.trim().length >= 2;
  const canPick = presenceModel.isJoined && roundModel.isPickOpen && pickCountdownSeconds === null;
  const statusTone = getStatusTone(statusMessage);

  useEffect(() => {
    if (!ENABLE_MOCK_WALLET) {
      setUseMockWallet(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedDisplayName = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (savedDisplayName) {
      setProfileModel((prev) => ({ ...prev, displayName: savedDisplayName }));
      setStatusMessage("Saved name loaded. Connect wallet and click Sign In & Join.");
    }

    const session = parsePersistedSession(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY));
    if (session) {
      setPersistedSession(session);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedName = profileModel.displayName.trim();
    if (!normalizedName) {
      window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, normalizedName);
  }, [profileModel.displayName]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onStateUpdate = (nextState: StateUpdatePayload) => {
      setRoundModel(nextState);
      if (!nextState.isPickOpen && nextState.selected.length === 0) {
        setPresenceModel((prev) => ({ ...prev, hasPicked: false }));
        setPickCountdownSeconds(null);
        if (presenceModel.isJoined) {
          setStatusMessage("Waiting for host to open picking.");
        }
      } else if (nextState.isPickOpen && presenceModel.isJoined && !presenceModel.hasPicked) {
        const remainingMs = nextState.pickOpensAt ? nextState.pickOpensAt - Date.now() : 0;
        if (remainingMs > 0) {
          setStatusMessage(`Get ready... ${Math.ceil(remainingMs / 1000)}`);
        } else {
          setStatusMessage("Pick is open. Tap PICK ME now.");
        }
      }
    };
    const onParticipantResult = (result: ParticipantResultPayload) => {
      setPresenceModel((prev) => ({
        ...prev,
        lastResult: result,
        hasPicked: result.selected || result.message.toLowerCase().includes("too late"),
      }));
      setStatusMessage(result.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state:update", onStateUpdate);
    socket.on("participant:result", onParticipantResult);

    if (!socket.connected) {
      socket.connect();
    } else {
      setSocketConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state:update", onStateUpdate);
      socket.off("participant:result", onParticipantResult);
    };
  }, [presenceModel.hasPicked, presenceModel.isJoined]);

  useEffect(() => {
    if (!presenceModel.isJoined || presenceModel.hasPicked || !roundModel.isPickOpen || !roundModel.pickOpensAt) {
      setPickCountdownSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const remainingMs = roundModel.pickOpensAt! - Date.now();
      if (remainingMs > 0) {
        const seconds = Math.ceil(remainingMs / 1000);
        setPickCountdownSeconds(seconds);
        setStatusMessage(`Get ready... ${seconds}`);
        return;
      }

      setPickCountdownSeconds(null);
      setStatusMessage("Pick is open. Tap PICK ME now.");
    };

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 150);

    return () => {
      window.clearInterval(timerId);
    };
  }, [presenceModel.hasPicked, presenceModel.isJoined, roundModel.isPickOpen, roundModel.pickOpensAt]);

  useEffect(() => {
    if (!presenceModel.isJoined) {
      return;
    }

    const walletChanged = !!currentAddress && presenceModel.joinedAddress.toLowerCase() !== currentAddress.toLowerCase();
    const modeChanged = authModel.mode !== null && authModel.mode !== currentMode;
    const disconnectedWallet = !useMockWallet && !isConnected;

    if (!walletChanged && !modeChanged && !disconnectedWallet) {
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }

    setPersistedSession(null);
    setAuthModel((prev) => ({
      ...prev,
      mode: null,
      signedAddress: "",
      signature: "",
      isSignedIn: false,
    }));
    setPresenceModel((prev) => ({
      ...prev,
      isJoined: false,
      joinedAddress: "",
      hasPicked: false,
      lastResult: null,
    }));
    setProfileModel((prev) => ({ ...prev, isEditingName: false }));
    setStatusMessage("Identity changed. Click Sign In & Join again.");
  }, [authModel.mode, currentAddress, currentMode, isConnected, presenceModel.isJoined, presenceModel.joinedAddress, useMockWallet]);

  async function emitWithAck(event: string, payload: unknown): Promise<SocketAck> {
    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit(event, payload, (ack: SocketAck) => {
        resolve(ack);
      });
    });
  }

  function persistSession(session: PersistedSession): void {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    setPersistedSession(session);
  }

  async function joinWithSignature(options: {
    loginAddress: string;
    signature: string;
    displayName: string;
    mode: AuthMode;
    isNameEdit: boolean;
    sourceLabel: "manual" | "restore";
  }): Promise<void> {
    const ack = await emitWithAck("participant:join", {
      address: options.loginAddress,
      displayName: options.displayName,
      signature: options.signature,
      message: SIGN_IN_MESSAGE,
    });

    if (!ack.ok) {
      if (options.sourceLabel === "restore" && typeof window !== "undefined") {
        window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        setPersistedSession(null);
      }
      setStatusMessage(ack.error ?? "Failed to join.");
      return;
    }

    setAuthModel((prev) => ({
      ...prev,
      mode: options.mode,
      signedAddress: options.loginAddress,
      signature: options.signature,
      isSignedIn: true,
    }));
    setPresenceModel((prev) => ({
      ...prev,
      isJoined: true,
      joinedAddress: options.loginAddress,
      hasPicked: options.isNameEdit ? prev.hasPicked : false,
      lastResult: options.isNameEdit ? prev.lastResult : null,
    }));
    setProfileModel((prev) => ({
      ...prev,
      displayName: options.displayName,
      joinedDisplayName: options.displayName,
      isEditingName: false,
    }));

    persistSession({
      mode: options.mode,
      address: options.loginAddress,
      signature: options.signature,
      message: SIGN_IN_MESSAGE,
      displayName: options.displayName,
    });

    setStatusMessage(options.isNameEdit ? "Display name updated." : "Signed in and joined. Waiting for host to open picking.");
  }

  async function handleJoin(): Promise<void> {
    if (presenceModel.isJoined && !profileModel.isEditingName) {
      return;
    }

    const normalizedName = profileModel.displayName.trim();
    if (normalizedName.length < 2) {
      setStatusMessage("Display name must be at least 2 characters.");
      return;
    }

    let loginAddress = "";
    let signature = "";
    const isNameEdit = presenceModel.isJoined && profileModel.isEditingName;

    try {
      setAuthModel((prev) => ({ ...prev, isSubmitting: true }));

      if (useMockWallet) {
        if (!ENABLE_MOCK_WALLET) {
          setStatusMessage("Mock mode is disabled.");
          return;
        }

        loginAddress = mockAddress.trim();
        if (!loginAddress) {
          setStatusMessage("Please enter a mock wallet address.");
          return;
        }
        signature = "MOCK_SIGNATURE";
      } else {
        if (!isConnected || !address) {
          setStatusMessage("Connect wallet first.");
          return;
        }

        loginAddress = address;
        const canReuseSignature =
          isNameEdit &&
          authModel.isSignedIn &&
          authModel.signature.length > 0 &&
          authModel.signedAddress.toLowerCase() === loginAddress.toLowerCase();

        signature = canReuseSignature
          ? authModel.signature
          : await signMessageAsync({
              message: SIGN_IN_MESSAGE,
            });
      }

      await joinWithSignature({
        loginAddress,
        signature,
        displayName: normalizedName,
        mode: currentMode,
        isNameEdit,
        sourceLabel: "manual",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sign in failed.";
      setStatusMessage(errorMessage);
    } finally {
      setAuthModel((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  useEffect(() => {
    if (!socketConnected || presenceModel.isJoined || authModel.isSubmitting || !persistedSession) {
      return;
    }

    if (persistedSession.message !== SIGN_IN_MESSAGE) {
      return;
    }

    if (persistedSession.mode !== currentMode) {
      return;
    }

    if (!currentAddress || persistedSession.address.toLowerCase() !== currentAddress.toLowerCase()) {
      return;
    }

    const nameForRestore = profileModel.displayName.trim() || persistedSession.displayName.trim();
    if (nameForRestore.length < 2) {
      return;
    }

    const attemptKey = `${persistedSession.mode}:${persistedSession.address.toLowerCase()}:${persistedSession.signature}`;
    if (restoreAttemptRef.current === attemptKey) {
      return;
    }
    restoreAttemptRef.current = attemptKey;

    setAuthModel((prev) => ({ ...prev, isSubmitting: true }));
    setStatusMessage("Restoring signed-in session...");

    void joinWithSignature({
      loginAddress: persistedSession.address,
      signature: persistedSession.signature,
      displayName: nameForRestore,
      mode: persistedSession.mode,
      isNameEdit: false,
      sourceLabel: "restore",
    }).finally(() => {
      setAuthModel((prev) => ({ ...prev, isSubmitting: false }));
    });
  }, [
    authModel.isSubmitting,
    currentAddress,
    currentMode,
    persistedSession,
    presenceModel.isJoined,
    profileModel.displayName,
    socketConnected,
  ]);

  async function handlePick() {
    if (!presenceModel.isJoined || !presenceModel.joinedAddress) {
      setStatusMessage("Sign in and join before picking.");
      return;
    }

    try {
      setIsPicking(true);
      const ack = await emitWithAck("participant:pick", { address: presenceModel.joinedAddress });
      if (!ack.ok) {
        setStatusMessage(ack.error ?? "Pick failed.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Pick failed.";
      setStatusMessage(errorMessage);
    } finally {
      setIsPicking(false);
    }
  }

  function clearSessionAndPresence(message: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }

    setPersistedSession(null);
    setAuthModel({
      mode: null,
      signedAddress: "",
      signature: "",
      isSignedIn: false,
      isSubmitting: false,
    });
    setPresenceModel({
      isJoined: false,
      joinedAddress: "",
      hasPicked: false,
      lastResult: null,
    });
    setProfileModel((prev) => ({ ...prev, isEditingName: false }));
    setStatusMessage(message);
  }

  function handleConnectWallet() {
    const connector = connectors[0];
    if (!connector) {
      setStatusMessage("No injected wallet connector found.");
      return;
    }
    connect({ connector });
  }

  function handleDisconnectIdentity() {
    clearSessionAndPresence("Disconnected. Connect wallet to start again.");

    if (useMockWallet) {
      setMockAddress("");
      return;
    }

    disconnect();
  }

  function handleStartEditingName() {
    if (!presenceModel.isJoined) {
      return;
    }
    setProfileModel((prev) => ({ ...prev, isEditingName: true }));
    setStatusMessage("Edit your display name, then click Save Name.");
  }

  function handleCancelEditingName() {
    setProfileModel((prev) => ({
      ...prev,
      isEditingName: false,
      displayName: prev.joinedDisplayName,
    }));
    setStatusMessage("Name edit canceled.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 md:px-6">
      <div className="w-full space-y-5 rounded-3xl border border-border bg-surface/90 p-6 shadow-2xl shadow-black/30 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">PickMe</h1>
          <p className="text-sm text-slate-300 md:text-base">Fair participant picker for ETH Bootcamp</p>
        </header>

        {currentStep === "connect" ? (
          <div className="grid gap-4">
            <WalletConnect
              enableMockWallet={ENABLE_MOCK_WALLET}
              useMockWallet={useMockWallet}
              onUseMockWalletChange={setUseMockWallet}
              isConnected={isConnected}
              address={address}
              connectPending={connectPending}
              onConnectWallet={handleConnectWallet}
              onDisconnectWallet={() => disconnect()}
              mockAddress={mockAddress}
              onMockAddressChange={setMockAddress}
            />
            <p className={`rounded-xl border border-border bg-panel/80 px-4 py-3 text-sm ${statusTone}`}>{statusMessage}</p>
          </div>
        ) : null}

        {currentStep === "join" ? (
          <div className="grid gap-4">
            <section className="rounded-2xl border border-border bg-panel/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connected Wallet</p>
              <p className="mt-2 text-base text-slate-100">{formatAddress(activeAddress)}</p>
            </section>

            <ParticipantJoinForm
              displayName={profileModel.displayName}
              onDisplayNameChange={(value) => setProfileModel((prev) => ({ ...prev, displayName: value }))}
              onJoin={() => {
                void handleJoin();
              }}
              onSaveName={() => {
                void handleJoin();
              }}
              isJoining={authModel.isSubmitting}
              joined={presenceModel.isJoined}
              isEditingName={profileModel.isEditingName}
              canJoin={canJoin}
              onStartEditingName={handleStartEditingName}
              onCancelEditingName={handleCancelEditingName}
            />

            <button
              type="button"
              onClick={handleDisconnectIdentity}
              className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-warning hover:text-warning"
            >
              Disconnect and Go Back
            </button>

            <p className={`rounded-xl border border-border bg-panel/80 px-4 py-3 text-sm ${statusTone}`}>{statusMessage}</p>
          </div>
        ) : null}

        {currentStep === "pick" ? (
          <div className="grid gap-4">
            <section className="rounded-2xl border border-border bg-panel/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Participant</p>
              {profileModel.isEditingName ? (
                <div className="mt-3 space-y-3">
                  <input
                    value={profileModel.displayName}
                    onChange={(event) => setProfileModel((prev) => ({ ...prev, displayName: event.target.value }))}
                    maxLength={40}
                    placeholder="e.g., Alice"
                    className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleJoin();
                      }}
                      disabled={authModel.isSubmitting || !canSaveName}
                      className="w-full rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
                    >
                      {authModel.isSubmitting ? "Saving..." : "Save Name"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditingName}
                      disabled={authModel.isSubmitting}
                      className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-2xl font-bold text-white">{profileModel.joinedDisplayName || profileModel.displayName}</p>
                  <button
                    type="button"
                    onClick={handleStartEditingName}
                    className="rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-accent hover:text-accent"
                  >
                    Edit Name
                  </button>
                </div>
              )}
            </section>

            <PickButton
              canPick={canPick}
              hasClicked={presenceModel.hasPicked}
              isSubmitting={isPicking}
              onPick={handlePick}
              labelOverride={pickCountdownSeconds ? `${pickCountdownSeconds}` : undefined}
              disableOverride={pickCountdownSeconds !== null}
            />

            <section className="rounded-2xl border border-border bg-panel/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session Status</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-sky-400/50 bg-sky-500/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-sky-200">Socket</p>
                  <p className="mt-1 text-sm font-semibold text-sky-100">{socketConnected ? "Connected" : "Disconnected"}</p>
                </div>
                <div
                  className={[
                    "rounded-xl border px-3 py-2",
                    roundModel.isPickOpen
                      ? "border-accent/70 bg-accent/15"
                      : "border-amber-400/50 bg-amber-500/10",
                  ].join(" ")}
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-200">Round</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{roundModel.isPickOpen ? "Open" : "Closed"}</p>
                </div>
                <div className="rounded-xl border border-indigo-400/50 bg-indigo-500/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-indigo-200">Participants</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-100">{roundModel.participantsCount}</p>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={handleDisconnectIdentity}
              className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-warning hover:text-warning"
            >
              Disconnect
            </button>

            <p className={`rounded-xl border border-border bg-panel/80 px-4 py-3 text-sm ${statusTone}`}>{statusMessage}</p>
            {presenceModel.lastResult?.selected && presenceModel.lastResult.position ? (
              <p className="text-center text-xs uppercase tracking-[0.2em] text-accent">
                You were selected at position #{presenceModel.lastResult.position}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
