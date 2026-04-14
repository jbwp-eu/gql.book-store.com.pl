export function getAuthToken(): string | null {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }
  return token;
}
export function getAuthHeader() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export function tokenLoader() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }
  return token;
}

type JwtPayload = {
  exp: number;
};

// The signature is located in the third part of the JWT, after the second period ('.').
// JWT format: header.payload.signature
function decodeJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT");
  }
  // parts[2] (if exists) is the signature, but we don't use or verify it here.
  const payload = parts[1];
  // Base64url decode
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  // Pad base64 string to be a multiple of 4 characters
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as JwtPayload;
}

export function getTokenDuration(token: string) {
  const decodedToken = decodeJwt(token);
  const now = new Date();
  const expirationDate = new Date(decodedToken.exp * 1000);
  const duration = expirationDate.getTime() - now.getTime();
  return duration;
}