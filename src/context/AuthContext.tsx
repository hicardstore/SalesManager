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
  resetPassword: (email: string) => Promise<{ success: boolean; method: string; tempPassword?: string }>;
  updateUserPassword: (newPass: string) => Promise<boolean>;
  deleteUserAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setUser(null);
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
      setUser(userInfo);
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";

      // If the user is not found in real Firebase Auth, let's auto-register them
      if (errCode === "auth/user-not-found" || errCode === "auth/invalid-credential" || err.message?.includes("user-not-found")) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, pass);
          const userInfo = {
            id: credential.user.uid,
            email: credential.user.email || email,
            name: email.split("@")[0]
          };
          setUser(userInfo);
          return true;
        } catch (regErr: any) {
          console.warn("Auto Firebase registration did not succeed:", regErr?.message || regErr);
          throw new Error("فشل تسجيل الدخول أو إنشاء حساب جديد. يرجى التأكد من تفعيل Email/Password في Firebase.");
        }
      }
      
      throw new Error("حدث خطأ أثناء تسجيل الدخول: " + err.message);
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
      setUser(userInfo);
      return true;
    } catch (err: any) {
      throw new Error("حدث خطأ أثناء التسجيل: " + err.message);
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
      
      throw new Error("فشل تسجيل الدخول كزائر. تأكد من تفعيل Email/Password في Firebase: " + err.message);
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
      return { success: true, method: "firebase" };
    } catch (err: any) {
      throw new Error("حدث خطأ أثناء استعادة كلمة المرور: " + err.message);
    }
  };

  const updateUserPassword = async (newPass: string) => {
    if (!auth.currentUser) {
      throw new Error("يجب تسجيل الدخول أولاً.");
    }

    try {
      await updatePassword(auth.currentUser, newPass);
      return true;
    } catch (err: any) {
      throw new Error("فشل تغيير كلمة المرور: " + err.message);
    }
  };

  const deleteUserAccount = async (): Promise<boolean> => {
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

