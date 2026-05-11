"use client";

import { useEffect, useState } from "react";

import { HostControls } from "@/components/HostControls";
import { SelectedList } from "@/components/SelectedList";
import { getSocket } from "@/lib/socket";
import type { SocketAck, StateUpdatePayload } from "@/lib/types";

const initialState: StateUpdatePayload = {
  isPickOpen: false,
  participantsCount: 0,
  selected: [],
};

export function HostClient() {
  const [state, setState] = useState<StateUpdatePayload>(initialState);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("Waiting for participants.");

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onStateUpdate = (nextState: StateUpdatePayload) => {
      setState(nextState);
      if (nextState.isPickOpen) {
        setNotice("Round is open. Awaiting first three picks.");
      } else if (nextState.selected.length === 3) {
        setNotice("Round closed automatically after three selections.");
      } else if (nextState.selected.length === 0) {
        setNotice("Round closed. Click Open Pick for next question.");
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state:update", onStateUpdate);

    if (!socket.connected) {
      socket.connect();
    } else {
      setSocketConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state:update", onStateUpdate);
    };
  }, []);

  async function emitWithAck(event: string): Promise<SocketAck> {
    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit(event, {}, (ack: SocketAck) => {
        resolve(ack);
      });
    });
  }

  async function handleOpenPick() {
    try {
      setIsBusy(true);
      const ack = await emitWithAck("host:open-pick");
      if (!ack.ok) {
        setNotice(ack.error ?? "Could not open pick.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReset() {
    try {
      setIsBusy(true);
      const ack = await emitWithAck("host:reset");
      if (!ack.ok) {
        setNotice(ack.error ?? "Could not reset round.");
      } else {
        setNotice("Round reset. Ready for the next question.");
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="space-y-6">
        <header className="space-y-3 rounded-2xl border border-border bg-surface/90 p-6 md:p-8">
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">ETH Bootcamp PickMe</h1>
          <p className="text-sm text-slate-300 md:text-base">
            Host Dashboard • Socket {socketConnected ? "Connected" : "Disconnected"}
          </p>
        </header>

        <HostControls
          participantsCount={state.participantsCount}
          isPickOpen={state.isPickOpen}
          isBusy={isBusy}
          onOpenPick={handleOpenPick}
          onReset={handleReset}
        />

        <p className="rounded-xl border border-border bg-panel/80 px-4 py-3 text-sm text-slate-300 md:text-base">{notice}</p>

        <SelectedList selected={state.selected} />
      </div>
    </main>
  );
}
