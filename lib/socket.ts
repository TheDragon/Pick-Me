"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket can only be created in the browser.");
  }

  if (!socket) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}
