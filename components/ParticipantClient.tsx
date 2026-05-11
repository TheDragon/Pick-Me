"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

import { ParticipantJoinForm } from "@/components/ParticipantJoinForm";
import { PickButton } from "@/components/PickButton";
import { WalletConnect } from "@/components/WalletConnect";
import { ENABLE_MOCK_WALLET, SIGN_IN_MESSAGE } from "@/lib/constants";
import { formatAddress } from "@/lib/formatAddress";
import { getSocket } from "@/lib/socket";
import type { ParticipantResultPayload, SocketAck, StateUpdatePayload } from "@/lib/types";

const initialState: StateUpdatePayload = {
  isPickOpen: false,
  participantsCount: 0,
  selected: [],
};
const DISPLAY_NAME_STORAGE_KEY = "pickme.displayName";

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

export function ParticipantClient() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<StateUpdatePayload>(initialState);
  const [socketConnected, setSocketConnected] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [mockAddress, setMockAddress] = useState("");
  const [useMockWallet, setUseMockWallet] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedAddress, setJoinedAddress] = useState<string>("");
  const [joinedDisplayName, setJoinedDisplayName] = useState("");
  const [joined, setJoined] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [sessionSignature, setSessionSignature] = useState("");
  const [hasClicked, setHasClicked] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Connect wallet. You will auto-join after entering your name.");
  const [lastResult, setLastResult] = useState<ParticipantResultPayload | null>(null);
  const lastAutoJoinKeyRef = useRef("");

  const activeAddress = useMemo(() => {
    if (joined) {
      return joinedAddress;
    }
    if (useMockWallet) {
      return mockAddress.trim();
    }
    return address ?? "";
  }, [address, joined, joinedAddress, mockAddress, useMockWallet]);

  useEffect(() => {
    if (!ENABLE_MOCK_WALLET) {
      setUseMockWallet(false);
    }
  }, []);

  useEffect(() => {
    if (useMockWallet || isConnected) {
      return;
    }

    if (joined) {
      setJoined(false);
      setJoinedAddress("");
      setSessionSignature("");
      setIsEditingName(false);
      setHasClicked(false);
      setStatusMessage("Connect wallet. You will auto-join after entering your name.");
    }
  }, [isConnected, joined, useMockWallet]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedDisplayName = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (savedDisplayName) {
      setDisplayName(savedDisplayName);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const value = displayName.trim();
    if (!value) {
      window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);
  }, [displayName]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onStateUpdate = (nextState: StateUpdatePayload) => {
      setState(nextState);
      if (!nextState.isPickOpen && nextState.selected.length === 0) {
        setHasClicked(false);
        if (joined) {
          setStatusMessage("Waiting for host to open picking.");
        }
      } else if (nextState.isPickOpen && joined && !hasClicked) {
        setStatusMessage("Pick is open. Tap PICK ME now.");
      }
    };
    const onParticipantResult = (result: ParticipantResultPayload) => {
      setLastResult(result);
      setStatusMessage(result.message);
      if (result.selected || result.message.toLowerCase().includes("too late")) {
        setHasClicked(true);
      }
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
  }, [hasClicked, joined]);

  const autoJoinAddress = useMemo(() => {
    return useMockWallet ? mockAddress.trim() : (address ?? "");
  }, [address, mockAddress, useMockWallet]);

  useEffect(() => {
    if (!joined || !joinedAddress) {
      return;
    }

    if (!autoJoinAddress) {
      return;
    }

    if (joinedAddress.toLowerCase() === autoJoinAddress.toLowerCase()) {
      return;
    }

    setJoined(false);
    setJoinedAddress("");
    setSessionSignature("");
    setIsEditingName(false);
    setHasClicked(false);
    setStatusMessage("Wallet changed. Rejoining automatically...");
  }, [autoJoinAddress, joined, joinedAddress]);

  async function emitWithAck(event: string, payload: unknown): Promise<SocketAck> {
    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit(event, payload, (ack: SocketAck) => {
        resolve(ack);
      });
    });
  }

  function handleConnectWallet() {
    const connector = connectors[0];
    if (!connector) {
      setStatusMessage("No injected wallet connector found.");
      return;
    }

    connect({ connector });
  }

  async function handleJoin() {
    if (joined && !isEditingName) {
      return;
    }

    const normalizedName = displayName.trim();
    if (normalizedName.length < 2) {
      setStatusMessage("Display name must be at least 2 characters.");
      return;
    }

    let loginAddress = "";
    let signature = "";
    const message = SIGN_IN_MESSAGE;
    const isSavingNameEdit = joined && isEditingName;

    try {
      setIsJoining(true);

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
          isSavingNameEdit &&
          joinedAddress.toLowerCase() === loginAddress.toLowerCase() &&
          sessionSignature.length > 0;

        if (canReuseSignature) {
          signature = sessionSignature;
        } else {
          signature = await signMessageAsync({
            message,
          });
        }
      }

      const ack = await emitWithAck("participant:join", {
        address: loginAddress,
        displayName: normalizedName,
        signature,
        message,
      });

      if (!ack.ok) {
        setStatusMessage(ack.error ?? "Failed to join.");
        return;
      }

      setJoined(true);
      setJoinedAddress(loginAddress);
      setJoinedDisplayName(normalizedName);
      setDisplayName(normalizedName);
      setSessionSignature(signature);
      setIsEditingName(false);
      setLastResult(null);
      if (!isSavingNameEdit) {
        setHasClicked(false);
      }
      setStatusMessage(isSavingNameEdit ? "Display name updated." : "Joined. Waiting for host to open picking.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Join failed.";
      setStatusMessage(errorMessage);
    } finally {
      setIsJoining(false);
    }
  }

  useEffect(() => {
    if (joined || isJoining || isEditingName || !socketConnected) {
      return;
    }

    const normalizedName = displayName.trim();
    if (normalizedName.length < 2) {
      return;
    }

    const hasAddress = autoJoinAddress.length > 0;
    const canAutoJoin = useMockWallet ? ENABLE_MOCK_WALLET && hasAddress : isConnected && hasAddress;

    if (!canAutoJoin) {
      return;
    }

    const autoJoinKey = `${useMockWallet ? "mock" : "wallet"}:${autoJoinAddress.toLowerCase()}:${normalizedName.toLowerCase()}`;
    if (lastAutoJoinKeyRef.current === autoJoinKey) {
      return;
    }

    lastAutoJoinKeyRef.current = autoJoinKey;
    void handleJoin();
  }, [autoJoinAddress, displayName, handleJoin, isConnected, isEditingName, isJoining, joined, socketConnected, useMockWallet]);

  async function handlePick() {
    if (!joined || !joinedAddress) {
      setStatusMessage("Connect wallet and wait for auto-join before picking.");
      return;
    }

    try {
      setIsPicking(true);
      const ack = await emitWithAck("participant:pick", { address: joinedAddress });
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

  const canPick = joined && state.isPickOpen;
  const statusTone = getStatusTone(statusMessage);

  function handleStartEditingName() {
    if (!joined) {
      return;
    }

    setIsEditingName(true);
    setStatusMessage("Edit your display name, then click Save Name.");
  }

  function handleCancelEditingName() {
    setIsEditingName(false);
    setDisplayName(joinedDisplayName);
    setStatusMessage("Name edit canceled.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 md:px-6">
      <div className="w-full space-y-5 rounded-3xl border border-border bg-surface/90 p-6 shadow-2xl shadow-black/30 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">PickMe</h1>
          <p className="text-sm text-slate-300 md:text-base">Fair participant picker for ETH Bootcamp</p>
        </header>

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

          <ParticipantJoinForm
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onSaveName={handleJoin}
            isJoining={isJoining}
            joined={joined}
            isEditingName={isEditingName}
            onStartEditingName={handleStartEditingName}
            onCancelEditingName={handleCancelEditingName}
          />

          <section className="rounded-2xl border border-border bg-panel/80 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session Status</p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>Wallet: {formatAddress(activeAddress)}</p>
              <p>Socket: {socketConnected ? "Connected" : "Disconnected"}</p>
              <p>Round: {state.isPickOpen ? "Open" : "Closed"}</p>
              <p>Participants online: {state.participantsCount}</p>
            </div>
          </section>

          <PickButton canPick={canPick} hasClicked={hasClicked} isSubmitting={isPicking} onPick={handlePick} />

          <p className={`rounded-xl border border-border bg-panel/80 px-4 py-3 text-sm ${statusTone}`}>{statusMessage}</p>
          {lastResult?.selected && lastResult.position ? (
            <p className="text-center text-xs uppercase tracking-[0.2em] text-accent">
              You were selected at position #{lastResult.position}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
