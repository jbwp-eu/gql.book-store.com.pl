import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { verifyToken } from "./auth/jwt.js";
import { findOrderById } from "./models/order.js";
import { findUserById } from "./models/user.js";
import { createChatMessage } from "./models/chat.js";
// This import ensures the database is initialized (tables created, data seeded) before the server starts.
import { dbReady } from "./db.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? "*",
  },
});

type SocketAuthState = {
  userId: string;
};

const socketAuthState = new Map<string, SocketAuthState>();
const messageWindowBySocket = new Map<string, number[]>();

function canAccessOrder(userId: string, orderId: string): boolean {
  const currentUser = findUserById(userId);
  if (!currentUser) {
    return false;
  }
  const order = findOrderById(orderId);
  if (!order) {
    return false;
  }
  return currentUser.isAdmin || order.user.id === currentUser.id;
}

function getSocketUserId(socketId: string): string | null {
  const state = socketAuthState.get(socketId);
  return state?.userId ?? null;
}

function roomForOrder(orderId: string): string {
  return `order:${orderId}`;
}

io.use((socket, next) => {
  const tokenFromAuth = socket.handshake.auth?.token;
  const tokenFromHeader =
    typeof socket.handshake.headers.authorization === "string"
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
      : null;
  const token =
    typeof tokenFromAuth === "string" && tokenFromAuth.length > 0
      ? tokenFromAuth
      : tokenFromHeader;

  if (!token) {
    next(new Error("Unauthorized"));
    return;
  }

  const payload = verifyToken(token);
  if (!payload?.userId) {
    next(new Error("Unauthorized"));
    return;
  }

  socketAuthState.set(socket.id, { userId: payload.userId });
  next();
});

io.on("connection", (socket) => {
  socket.on("chat:join", (payload: { orderId?: string }) => {
    const userId = getSocketUserId(socket.id);
    const orderId = payload?.orderId;

    if (!userId || !orderId || typeof orderId !== "string") {
      socket.emit("chat:error", { message: "Invalid join request." });
      return;
    }
    if (!canAccessOrder(userId, orderId)) {
      socket.emit("chat:error", { message: "Forbidden." });
      return;
    }

    socket.join(roomForOrder(orderId));
  });

  socket.on(
    "chat:send",
    (payload: { orderId?: string; content?: string; clientMessageId?: string }) => {
      const userId = getSocketUserId(socket.id);
      const orderId = payload?.orderId;
      const rawContent = payload?.content;
      const content = typeof rawContent === "string" ? rawContent.trim() : "";

      if (!userId || !orderId || typeof orderId !== "string") {
        socket.emit("chat:error", { message: "Invalid message request." });
        return;
      }
      if (!canAccessOrder(userId, orderId)) {
        socket.emit("chat:error", { message: "Forbidden." });
        return;
      }
      if (!content || content.length > 1000) {
        socket.emit("chat:error", { message: "Message content is invalid." });
        return;
      }

      const now = Date.now();
      const timestamps = (messageWindowBySocket.get(socket.id) ?? []).filter(
        (t) => now - t < 60_000
      );
      if (timestamps.length >= 20) {
        socket.emit("chat:error", { message: "Rate limit exceeded." });
        return;
      }
      timestamps.push(now);
      messageWindowBySocket.set(socket.id, timestamps);

      try {
        const message = createChatMessage({
          orderId,
          senderUserId: userId,
          content,
        });

        io.to(roomForOrder(orderId)).emit("chat:message", {
          ...message,
          clientMessageId:
            typeof payload?.clientMessageId === "string"
              ? payload.clientMessageId
              : null,
        });
      } catch (err) {
        socket.emit("chat:error", {
          message: err instanceof Error ? err.message : "Failed to send message.",
        });
      }
    }
  );

  socket.on("disconnect", () => {
    socketAuthState.delete(socket.id);
    messageWindowBySocket.delete(socket.id);
  });
});

/**
 * Starts the GraphQL server after ensuring the database is fully initialized.
 *
 * - The constant PORT is set from the environment variable PORT, or defaults to 4000.
 * - The async function `start`:
 *      - First, waits for the database initialization to complete (`dbReady`). This includes seeding users/products if necessary.
 *      - Only after the DB is ready does it start listening for HTTP connections, ensuring that all database tables and any seed data are available before serving any requests.
 * - The last line calls `start()`, kicking off this process.
 *
 * The database "starts" (i.e., any migrations, table creation, and initial data seeding) before the Express server binds to a port.
 * This is enforced by the `await dbReady;` line inside the `start` function.
 * As a result, when you see "GraphQL server at http://localhost:4000/graphql" in your logs, the DB setup is already complete and the server is ready to handle requests.
 */
const PORT = process.env.PORT ?? 4000;
const start = async () => {
  await dbReady; // <- This waits for the DB (tables, seed data) to be ready before starting.
  // Old startup kept for reference:
  // app.listen(PORT, () => {
  //   console.log(`GraphQL server at http://localhost:${PORT}/graphql`);
  // });
  httpServer.listen(PORT, () => {
    if (process.env.NODE_ENV === "production") {
      console.log(`GraphQL server ready (PORT ${PORT})`);
    } else {
      console.log(`GraphQL server at http://localhost:${PORT}/graphql`);
    }
  });
};
start();
