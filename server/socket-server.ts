import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { getAddress, isAddress, verifyMessage, type Address, type Hex } from "viem";

import { ENABLE_MOCK_WALLET, MAX_SELECTED, PICK_COUNTDOWN_SECONDS, SIGN_IN_MESSAGE } from "../lib/constants";
import type {
  ParticipantJoinPayload,
  ParticipantPickPayload,
  SelectedParticipant,
  SocketAck,
  StateUpdatePayload,
} from "../lib/types";

type Participant = {
  address: Address;
  displayName: string;
  hasPicked: boolean;
  socketId: string;
  joinedAt: number;
};

const participants = new Map<string, Participant>();
let selected: SelectedParticipant[] = [];
let isPickOpen = false;
let pickOpensAt: number | null = null;

function normalizeAddress(input: string): Address | null {
  const trimmed = input.trim();
  if (!isAddress(trimmed, { strict: false })) {
    return null;
  }

  try {
    return getAddress(trimmed);
  } catch {
    return null;
  }
}

function getState(): StateUpdatePayload {
  return {
    isPickOpen,
    pickOpensAt,
    participantsCount: participants.size,
    selected,
  };
}

function broadcastState(io: Server): void {
  io.emit("state:update", getState());
}

function fail(ack: ((payload: SocketAck) => void) | undefined, error: string): void {
  ack?.({ ok: false, error });
}

function success(ack: ((payload: SocketAck) => void) | undefined): void {
  ack?.({ ok: true });
}

function resetRound(): void {
  selected = [];
  isPickOpen = false;
  pickOpensAt = null;

  for (const participant of participants.values()) {
    participant.hasPicked = false;
  }
}

async function verifyJoinPayload(
  payload: ParticipantJoinPayload,
  normalizedAddress: Address,
): Promise<boolean> {
  if (ENABLE_MOCK_WALLET && payload.signature === "MOCK_SIGNATURE") {
    return payload.message === SIGN_IN_MESSAGE;
  }

  if (payload.message !== SIGN_IN_MESSAGE) {
    return false;
  }

  try {
    return await verifyMessage({
      address: normalizedAddress,
      message: payload.message,
      signature: payload.signature as Hex,
    });
  } catch {
    return false;
  }
}

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    socket.emit("state:update", getState());

    socket.on("participant:join", async (payload: ParticipantJoinPayload, ack?: (payload: SocketAck) => void) => {
      const normalizedAddress = normalizeAddress(payload.address);
      if (!normalizedAddress) {
        fail(ack, "Invalid wallet address.");
        return;
      }

      const displayName = payload.displayName.trim().slice(0, 40);
      if (displayName.length < 2) {
        fail(ack, "Display name must be at least 2 characters.");
        return;
      }

      const key = normalizedAddress.toLowerCase();
      const existing = participants.get(key);
      if (existing && existing.socketId !== socket.id) {
        fail(ack, "This wallet is already joined in this session.");
        return;
      }

      const validSignature = await verifyJoinPayload(payload, normalizedAddress);
      if (!validSignature) {
        fail(ack, "Signature verification failed.");
        return;
      }

      participants.set(key, {
        address: normalizedAddress,
        displayName,
        hasPicked: existing?.hasPicked ?? false,
        socketId: socket.id,
        joinedAt: existing?.joinedAt ?? Date.now(),
      });

      success(ack);
      socket.emit("participant:result", {
        selected: false,
        message: "Joined. Waiting for host to open picking.",
      });
      broadcastState(io);
    });

    socket.on("participant:pick", (payload: ParticipantPickPayload, ack?: (payload: SocketAck) => void) => {
      const normalizedAddress = normalizeAddress(payload.address);
      if (!normalizedAddress) {
        fail(ack, "Invalid wallet address.");
        return;
      }

      const key = normalizedAddress.toLowerCase();
      const participant = participants.get(key);
      if (!participant) {
        fail(ack, "Please join first.");
        socket.emit("participant:result", {
          selected: false,
          message: "Please join before picking.",
        });
        return;
      }

      if (!isPickOpen) {
        success(ack);
        socket.emit("participant:result", {
          selected: false,
          message:
            selected.length >= MAX_SELECTED
              ? "Too late. Wait for the next round."
              : "Waiting for host to open picking.",
        });
        return;
      }

      if (pickOpensAt && Date.now() < pickOpensAt) {
        const remainingSeconds = Math.max(1, Math.ceil((pickOpensAt - Date.now()) / 1000));
        success(ack);
        socket.emit("participant:result", {
          selected: false,
          message: `Get ready... ${remainingSeconds}`,
        });
        return;
      }

      if (participant.hasPicked) {
        success(ack);
        socket.emit("participant:result", {
          selected: false,
          message: "Too late. Wait for the next round.",
        });
        return;
      }

      participant.hasPicked = true;

      if (selected.length < MAX_SELECTED) {
        const entry: SelectedParticipant = {
          address: participant.address,
          displayName: participant.displayName,
          position: selected.length + 1,
          clickedAt: Date.now(),
        };
        selected = [...selected, entry];
        socket.emit("participant:result", {
          selected: true,
          position: entry.position,
          message: `You were selected! Position #${entry.position}`,
        });
        success(ack);
        broadcastState(io);

        if (selected.length >= MAX_SELECTED) {
          isPickOpen = false;
          pickOpensAt = null;
          broadcastState(io);
        }
        return;
      }

      success(ack);
      socket.emit("participant:result", {
        selected: false,
        message: "Too late. Wait for the next round.",
      });
    });

    socket.on("host:open-pick", (_payload: Record<string, never>, ack?: (payload: SocketAck) => void) => {
      if (isPickOpen) {
        fail(ack, "Pick is already open.");
        return;
      }

      for (const participant of participants.values()) {
        participant.hasPicked = false;
      }

      selected = [];
      isPickOpen = true;
      pickOpensAt = Date.now() + PICK_COUNTDOWN_SECONDS * 1000;
      success(ack);
      broadcastState(io);
    });

    socket.on("host:reset", (_payload: Record<string, never>, ack?: (payload: SocketAck) => void) => {
      resetRound();
      success(ack);
      broadcastState(io);
    });

    socket.on("disconnect", () => {
      for (const [key, participant] of participants.entries()) {
        if (participant.socketId === socket.id) {
          participants.delete(key);
          break;
        }
      }
      broadcastState(io);
    });
  });

  return io;
}
