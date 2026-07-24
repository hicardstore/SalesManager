import { useState, useEffect } from "react";
import { User } from "../types";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

const getDeviceName = () => {
  const ua = navigator.userAgent;
  let browser = "متصفح غير معروف";
  let os = "نظام تشغيل غير معروف";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";

  if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} (${os})`;
};

export function useDevices(user: User | null, logout: () => void) {
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setDevices([]);
      return;
    }

    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = `dev_${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem("device_id", deviceId);
    }

    const myDeviceName = getDeviceName();
    const deviceDocId = `${user.id}_${deviceId}`;
    const deviceRef = doc(db, "devices", deviceDocId);

    let unsubCurrentDevice: () => void = () => {};

    const registerDevice = async () => {
      try {
        await setDoc(deviceRef, {
          id: deviceId,
          userId: user.id,
          deviceName: myDeviceName,
          lastActive: new Date().toISOString(),
          userAgent: navigator.userAgent
        }, { merge: true });

        let isInitial = true;
        unsubCurrentDevice = onSnapshot(deviceRef, (docSnap) => {
          if (isInitial) {
            isInitial = false;
            return;
          }
          if (!docSnap.exists()) {
            console.warn("This device session has been revoked from another device.");
            logout();
          }
        });
      } catch (err) {
        console.error("Failed to register device session:", err);
      }
    };

    registerDevice();

    const devicesRef = collection(db, "devices");
    const q = query(devicesRef, where("userId", "==", user.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          ...data,
          docId: doc.id,
          current: data.id === deviceId
        });
      });
      list.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      setDevices(list);
    }, (err) => {
      console.error("Failed to subscribe to devices:", err);
    });

    return () => {
      unsubscribe();
      if (unsubCurrentDevice) unsubCurrentDevice();
    };
  }, [user]);

  const handleDeleteDevice = async (deviceDocId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "devices", deviceDocId));
    } catch (err) {
      console.error("Failed to delete device session:", err);
    }
  };

  return { devices, handleDeleteDevice };
}
