import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function getStoredAuth() {
  // Use session storage so users don't get auto-logged in across browser restarts.
  const token = sessionStorage.getItem("token");
  const userJson = sessionStorage.getItem("user");

  // Remove legacy persistent auth from earlier builds.
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (!userJson) {
    return { token, user: null };
  }

  try {
    const user = JSON.parse(userJson);
    return { token, user };
  } catch {
    // Recover from stale/corrupt stored auth values instead of crashing the app.
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const initialAuth = getStoredAuth();
  const [token, setToken] = useState(initialAuth.token);
  const [user, setUser] = useState(initialAuth.user);

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    sessionStorage.setItem("token", nextToken);
    sessionStorage.setItem("user", JSON.stringify(nextUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
