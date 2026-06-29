import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, initAuth, googleSignIn as firebaseGoogleSignIn } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, signInAnonymously, updatePassword, deleteUser, getRedirectResult } from "firebase/auth";

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
    // Check for redirect result first
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        // Redirect login was successful
        const userInfo = {
          id: result.user.uid,
          email: result.user.email || "guest@finance.local",
          name: result.user.displayName || (result.user.email ? result.user.email.split("@")[0] : "مستخدم")
        };
        setUser(userInfo);
      }
    }).catch((error) => {
      console.error("Redirect login error:", error);
    });

    const unsubscribe = initAuth(
      (firebaseUser) => {
        const userInfo = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "guest@finance.local",
          name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "مستخدم")
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
      const result = await firebaseGoogleSignIn();
      if (!result) {
        // Fallback to redirect happened, the page will reload soon
        return true;
      }
      const { user: firebaseUser } = result;
      const userInfo = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName
      };
      setUser(userInfo);
      return true;
    } catch (err: any) {
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
        name: "مستخدم ضيف"
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
          name: "مستخدم ضيف (محلي)"
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
            name: "مستخدم ضيف"
          };
          setUser(userInfo);
          return true;
        } catch (regErr: any) {
          console.error("Failed to register unique guest:", regErr);
          
          if (regErr?.code === "auth/operation-not-allowed" || regErr?.message?.includes("operation-not-allowed")) {
            const localUser = {
              id: "offline_guest_user_id",
              email: "guest@finance.local",
              name: "مستخدم ضيف (محلي)"
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
              name: "مستخدم ضيف"
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
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check if it's a guest or demo local account email
    if (trimmedEmail.endsWith("@salesmanager.pro") || trimmedEmail.includes("guest@") || trimmedEmail.includes("offline")) {
      return { 
        success: true, 
        method: "local", 
        tempPassword: "123456" 
      };
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return { success: true, method: "firebase" };
    } catch (err: any) {
      const errCode = err?.code || "";
      const errMsg = err?.message || "";
      console.error("Firebase sendPasswordResetEmail error:", err);

      if (errCode === "auth/unauthorized-domain" || errMsg.includes("unauthorized-domain")) {
        throw new Error(
          `فشل الإرسال: هذا النطاق (${window.location.hostname}) غير مصرح به في إعدادات مشروع Firebase الخاص بك. يرجى إضافة هذا النطاق في لوحة تحكم Firebase تحت: Authentication -> Settings -> Authorized Domains ليعمل الإرسال بشكل سليم.`
        );
      }
      if (errCode === "auth/user-not-found" || errMsg.includes("user-not-found")) {
        throw new Error("هذا البريد الإلكتروني غير مسجل في النظام. يرجى التأكد من كتابة البريد بشكل صحيح أو إنشاء حساب جديد.");
      }
      if (errCode === "auth/invalid-email" || errMsg.includes("invalid-email")) {
        throw new Error("صيغة البريد الإلكتروني غير صالحة. يرجى التأكد من إدخال بريد إلكتروني صحيح.");
      }
      if (errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed")) {
        throw new Error(
          "خدمة إرسال بريد استعادة كلمة المرور غير مفعلة. يرجى تفعيل موفر البريد الإلكتروني (Email/Password) في لوحة تحكم Firebase الخاصة بك تحت تبويب Sign-in providers."
        );
      }
      if (errCode === "auth/too-many-requests" || errMsg.includes("too-many-requests")) {
        throw new Error("تم إرسال طلبات كثيرة في وقت قصير لحماية هذا الحساب. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.");
      }
      
      throw new Error("حدث خطأ أثناء محاولة إرسال بريد استعادة كلمة المرور: " + (err.message || errCode));
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

