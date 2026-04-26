"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase";
import { fetchUserProfile } from "@/lib/firebase";
import { useSteamStore } from "@/lib/store";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useSteamStore((s) => s.setUser);
  const setAuthReady = useSteamStore((s) => s.setAuthReady);
  const setProfile = useSteamStore((s) => s.setProfile);
  const setOffline = useSteamStore((s) => s.setOffline);

  useEffect(() => {
    const auth = getAuthClient();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        const p = await fetchUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    on();
    return () => {
      unsub();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, [setUser, setAuthReady, setProfile, setOffline]);

  return (
    <>
      <ServiceWorkerRegister />
      {children}
    </>
  );
}
