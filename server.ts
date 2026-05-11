import { createServer } from "node:http";

import next from "next";

import { initializeSocketServer } from "./server/socket-server";

const dev = process.env.NODE_ENV !== "production";
const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);

const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      void handle(req, res);
    });

    initializeSocketServer(httpServer);

    httpServer.listen(PORT, HOST, () => {
      console.log(`> PickMe server ready at http://${HOST}:${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start PickMe server:", error);
    process.exit(1);
  });
