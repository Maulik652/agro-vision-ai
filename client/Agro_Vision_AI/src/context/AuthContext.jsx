import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  /* =========================
     Load user from localStorage
  ========================= */
  useEffect(() => {

    const loadUser = () => {

      try {

        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");

        if (storedUser && storedToken) {

          const parsedUser = JSON.parse(storedUser);

          if (parsedUser?.id && parsedUser?.role) {
            setUser(parsedUser);
          } else {
            logout();
          }

        }

      } catch (error) {

        console.error("Auth load error:", error);

        logout();

      } finally {

        setLoading(false);

      }

    };

    loadUser();

  }, []);


  /* =========================
     Login
  ========================= */
  const login = (userData, token) => {

    if (!userData || !token) return;

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);

    setUser(userData);

  };


  /* =========================
     Logout
  ========================= */
  const logout = () => {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    setUser(null);

  };


  /* =========================
     Sync logout across tabs
  ========================= */
  useEffect(() => {

    const syncLogout = (event) => {

      if (event.key === "token" && !event.newValue) {

        setUser(null);

      }

    };

    window.addEventListener("storage", syncLogout);

    return () => window.removeEventListener("storage", syncLogout);

  }, []);


  /* =========================
     Auth helpers
  ========================= */
  const isAuthenticated = !!user;


  return (

    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated
      }}
    >

      {!loading && children}

    </AuthContext.Provider>

  );

};


/* =========================
   Hook
========================= */
export const useAuth = () => {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;

};