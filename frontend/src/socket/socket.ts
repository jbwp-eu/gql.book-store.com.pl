import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "../../utils/auth";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

function getSocketUrlFromGraphqlUrl(graphqlUrl: string): string {
  if (graphqlUrl.startsWith("/")) {
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
  }
  try {
    const url = new URL(graphqlUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
  }
}

let socketSingleton: Socket | null = null;

export function getSocket(): Socket {
  if (socketSingleton) {
    return socketSingleton;
  }

  socketSingleton = io(getSocketUrlFromGraphqlUrl(getGraphqlHttpUrl()), {
    autoConnect: false,
    transports: ["websocket"],
  });

  return socketSingleton;
}

export function connectSocketWithAuth() {
  const socket = getSocket();
  const token = getAuthToken();
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
