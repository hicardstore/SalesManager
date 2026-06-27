import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, initAuth, googleSignIn as firebaseGoogleSignIn } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, signInAnonymously, updatePassword, deleteUser } from "firebase/auth";

interface User {
  id: string;
  email: string | null;
  name?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string) => Promise<boolean>;
  googleSignIn: () => Promise<boolean>;
  guestSignIn: () => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateUserPassword: (newPass: string) => Promise<boolean>;
  deleteUserAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if we have a locally stored active user (offline sandbox mode session)
    const localUserJson = localStorage.getItem("current_local_user");
    if (localUserJson) {
      try {
        setUser(JSON.parse(localUserJson));
        setLoading(false);
        return;
      } catch (err) {
        console.error("Failed to parse local sandbox user:", err);
      }
    }

    const unsubscribe = initAuth(
      (firebaseUser) => {
        const userInfo = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "guest@finance.local",
          name: firebaseUser.displayName || "زائر تجريبي"
        };
        setUser(userInfo);
        setLoading(false);
      },
      () => {
        // Only set null if we didn't deliberately start in offline local mode
        if (!localStorage.getItem("current_local_user")) {
          setUser(null);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const userInfo = {
        id: credential.user.uid,
        email: credential.user.email || email,
        name: credential.user.displayName || email.split("@")[0]
      };
      localStorage.removeItem("current_local_user");
      setUser(userInfo);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";

      // If the user is not found in real Firebase Auth, let's auto-register them
      if (errCode === "auth/user-not-found" || err.message?.includes("user-not-found")) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, pass);
          const userInfo = {
            id: credential.user.uid,
            email: credential.user.email || email,
            name: email.split("@")[0]
          };
          localStorage.removeItem("current_local_user");
          setUser(userInfo);
          return true;
        } catch (regErr: any) {
          console.warn("Auto Firebase registration did not succeed:", regErr?.message || regErr);
          // If auto registration fails, throw original 'user-not-found'
          throw err;
        }
      }
      
      if (errCode === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("Firebase Email auth disabled. Checking local credentials.");
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
        const normalizedEmail = email.toLowerCase().trim();
        const userIndex = localUsers.findIndex((u: any) => u.email.toLowerCase() === normalizedEmail);
        
        let targetUser;
        if (userIndex !== -1) {
          targetUser = localUsers[userIndex];
          if (targetUser.password !== pass) {
            const error = new Error("Firebase: Error (auth/wrong-password).");
            (error as any).code = "auth/wrong-password";
            throw error;
          }
        } else {
          // Auto-bootstrap/register new local user in sandbox
          targetUser = {
            email: normalizedEmail,
            password: pass,
            name: email.split("@")[0]
          };
          localUsers.push(targetUser);
          localStorage.setItem("local_users", JSON.stringify(localUsers));
        }
        
        const localUser = {
          id: `local_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
          email: email.trim(),
          name: targetUser.name || email.split("@")[0]
        };
        setUser(localUser);
        localStorage.setItem("current_local_user", JSON.stringify(localUser));
        return true;
      }
      throw err;
    }
  };

  const register = async (email: string, pass: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const userInfo = {
        id: credential.user.uid,
        email: credential.user.email || email,
        name: email.split("@")[0]
      };
      localStorage.removeItem("current_local_user");
      setUser(userInfo);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";
      if (errCode === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("Firebase Email registration disabled. Registering into client-side sandbox.");
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
        if (localUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase().trim())) {
          const error = new Error("Firebase: Error (auth/email-already-in-use).");
          (error as any).code = "auth/email-already-in-use";
          throw error;
        }
        
        localUsers.push({ email: email.toLowerCase().trim(), password: pass, name: email.split("@")[0] });
        localStorage.setItem("local_users", JSON.stringify(localUsers));
        
        // Auto sign in the newly registered local user
        const localUser = {
          id: `local_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
          email: email.trim(),
          name: email.split("@")[0]
        };
        setUser(localUser);
        localStorage.setItem("current_local_user", JSON.stringify(localUser));
        return true;
      }
      throw err;
    }
  };

  const googleSignIn = async () => {
    try {
      const { user: firebaseUser } = await firebaseGoogleSignIn();
      const userInfo = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName
      };
      localStorage.removeItem("current_local_user");
      setUser(userInfo);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";
      if (errCode === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        // Fallback to random guest details
        const fallbackUser = {
          id: "offline_google_sandbox_user",
          email: "google.sandbox@finance.local",
          name: "مستكشف جوجل التجريبي"
        };
        setUser(fallbackUser);
        localStorage.setItem("current_local_user", JSON.stringify(fallbackUser));
        return true;
      }
      throw err;
    }
  };

  const guestSignIn = async () => {
    // Generate a unique, persistent guest user session for this device
    // This maintains continuity of their test data and guarantees zero email collision
    let guestEmail = localStorage.getItem("guest_email");
    let guestPassword = localStorage.getItem("guest_password");
    
    if (!guestEmail || !guestPassword) {
      const uniqueGuestId = `guest_${Math.floor(100000 + Math.random() * 900000)}`;
      guestEmail = `${uniqueGuestId}@salesmanager.pro`;
      guestPassword = `pass_${uniqueGuestId}`;
      localStorage.setItem("guest_email", guestEmail);
      localStorage.setItem("guest_password", guestPassword);
    }

    try {
      // 1. Try logging in with the cached guest account/password
      const credential = await signInWithEmailAndPassword(auth, guestEmail, guestPassword);
      const userInfo = {
        id: credential.user.uid,
        email: credential.user.email || "guest@finance.local",
        name: "زائر تجريبي"
      };
      setUser(userInfo);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";
      
      // If operations not allowed, skip direct to local storage fallback
      if (errCode === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        const localUser = {
          id: "offline_guest_user_id",
          email: "guest@finance.local",
          name: "زائر تجريبي (محلي)"
        };
        setUser(localUser);
        localStorage.setItem("current_local_user", JSON.stringify(localUser));
        return true;
      }

      // 2. If it doesn't exist, register it dynamically
      if (errCode === "auth/user-not-found" || errCode === "auth/invalid-credential" || err.message?.includes("user-not-found")) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
          const userInfo = {
            id: credential.user.uid,
            email: credential.user.email || "guest@finance.local",
            name: "زائر تجريبي"
          };
          setUser(userInfo);
          return true;
        } catch (regErr: any) {
          console.error("Failed to register unique guest:", regErr);
          
          if (regErr?.code === "auth/operation-not-allowed" || regErr?.message?.includes("operation-not-allowed")) {
            const localUser = {
              id: "offline_guest_user_id",
              email: "guest@finance.local",
              name: "زائر تجريبي (محلي)"
            };
            setUser(localUser);
            localStorage.setItem("current_local_user", JSON.stringify(localUser));
            return true;
          }

          // 3. Fallback: If registration fails due to an unexpected email already in use, regenerate credentials
          const fallbackGuestId = `gfallback_${Math.floor(100000 + Math.random() * 900000)}`;
          const fallbackEmail = `${fallbackGuestId}@salesmanager.pro`;
          const fallbackPassword = `pass_${fallbackGuestId}`;
          localStorage.setItem("guest_email", fallbackEmail);
          localStorage.setItem("guest_password", fallbackPassword);
          
          try {
            const credential = await createUserWithEmailAndPassword(auth, fallbackEmail, fallbackPassword);
            const userInfo = {
              id: credential.user.uid,
              email: credential.user.email || "guest@finance.local",
              name: "زائر تجريبي"
            };
            setUser(userInfo);
            return true;
          } catch (lastErr: any) {
            console.error("Final fallback guest register failed:", lastErr);
          }
        }
      }
      
      // 4. Ultimate offline/local-state fallback so the user is never stuck
      const localUser = {
        id: "offline_guest_user_id",
        email: "guest@finance.local",
        name: "زائر تجريبي (محلي)"
      };
      setUser(localUser);
      localStorage.setItem("current_local_user", JSON.stringify(localUser));
      return true;
    }
  };

  const logout = async () => {
    localStorage.removeItem("current_local_user");
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";
      if (errCode === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("Reset password operation not allowed. Simulating.");
        return true;
      }
      throw err;
    }
  };

  const updateUserPassword = async (newPass: string) => {
    if (!auth.currentUser || user?.id.startsWith("local_") || user?.id === "offline_guest_user_id") {
      const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
      const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
      const userIndex = localUsers.findIndex((u: any) => u.email.toLowerCase() === userEmailNormalized);
      if (userIndex !== -1) {
        localUsers[userIndex].password = newPass;
        localStorage.setItem("local_users", JSON.stringify(localUsers));
      }
      if (user?.id === "offline_guest_user_id") {
        localStorage.setItem("guest_password", newPass);
      }
      return true;
    }

    try {
      await updatePassword(auth.currentUser, newPass);
      return true;
    } catch (err: any) {
      console.error("Firebase updatePassword error:", err);
      const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
      const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
      const userIndex = localUsers.findIndex((u: any) => u.email.toLowerCase() === userEmailNormalized);
      if (userIndex !== -1) {
        localUsers[userIndex].password = newPass;
        localStorage.setItem("local_users", JSON.stringify(localUsers));
      }
      return true;
    }
  };

  const deleteUserAccount = async (): Promise<boolean> => {
    const isLocal = !auth.currentUser || user?.id.startsWith("local_") || user?.id === "offline_guest_user_id";
    const userEmailNormalized = user?.email?.toLowerCase().trim() || "";

    if (isLocal) {
      try {
        localStorage.removeItem("current_local_user");
        if (userEmailNormalized) {
          localStorage.removeItem(`local_project_${userEmailNormalized}`);
          localStorage.removeItem(`local_ops_local_proj_${user?.id}`);
          localStorage.removeItem(`local_ops_${user?.id}`);
          const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
          const updatedLocalUsers = localUsers.filter((u: any) => u.email.toLowerCase() !== userEmailNormalized);
          localStorage.setItem("local_users", JSON.stringify(updatedLocalUsers));
        }
        localStorage.removeItem("guest_password");
        setUser(null);
        return true;
      } catch (err) {
        console.error("Local account delete failed:", err);
        setUser(null);
        return true;
      }
    }

    try {
      const u = auth.currentUser;
      if (u) {
        await deleteUser(u);
      }
      setUser(null);
      return true;
    } catch (err: any) {
      console.error("Firebase deleteUser error, forcing signout/cleanup:", err);
      // If full session delete fails due to credential age, we still log out and let user clear local state
      try {
        await signOut(auth);
      } catch (soErr) {}
      setUser(null);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleSignIn, guestSignIn, logout, resetPassword, updateUserPassword, deleteUserAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

