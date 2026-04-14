import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const USER_INFO_KEY = "userInfo";

export const TOKEN_KEY = "token";

export type AuthState = {
  userInfo: {
    id: string | null;
    name: string | null;
    email: string | null;
    isAdmin: boolean | null;
  };
};

const emptyUserInfo = {
  id: null as string | null,
  name: null as string | null,
  email: null as string | null,
  isAdmin: null as boolean | null,
};

function getInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { userInfo: { ...emptyUserInfo } };
  }
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return { userInfo: { ...emptyUserInfo } };
    const parsed = JSON.parse(raw) as {
      id?: string;
      name?: string;
      email?: string;
      isAdmin?: boolean;
      token?: string;
    };
    if (parsed && typeof parsed.isAdmin === "boolean") {
      if (typeof parsed.token === "string") {
        localStorage.setItem(TOKEN_KEY, parsed.token);
      }
      return {
        userInfo: {
          id: parsed.id ?? null,
          name: parsed.name ?? null,
          email: parsed.email ?? null,
          isAdmin: parsed.isAdmin,
        },
      };
    }
  } catch {
    // ignore invalid stored data
  }
  return { userInfo: { ...emptyUserInfo } };
}

const initialState: AuthState = getInitialAuthState();

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
        email: string;
        isAdmin: boolean;
      }>
    ) => {
      state.userInfo = action.payload;
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = { ...emptyUserInfo };
      localStorage.removeItem(USER_INFO_KEY);
      localStorage.removeItem(TOKEN_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ?? null;
  } catch {
    return null;
  }
}
