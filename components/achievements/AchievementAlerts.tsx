"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/apiClient";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AchievementAlerts() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
    if (typeof window !== "undefined" && "Notification" in window) {
      setPerm(Notification.permission);
    }
  }, []);

  const refreshSubscriptionState = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

  const configured = !!VAPID_KEY;

  const enable = async () => {
    if (!configured || !supported || !VAPID_KEY) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") return;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
        });
      }
      const json = sub.toJSON();
      await authedFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(json),
      });
      setSubscribed(true);
    } catch {
      /* denied / offline */
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        await authedFetch("/api/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: json.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  if (supported === false) {
    return (
      <p className="text-sm text-zinc-500">
        Browser notifications are not supported in this environment.
      </p>
    );
  }

  if (!configured) {
    return (
      <p className="text-sm text-zinc-500">
        Achievement alerts are not configured on this server (set{" "}
        <code className="font-mono text-zinc-400">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> and{" "}
        <code className="font-mono text-zinc-400">VAPID_PRIVATE_KEY</code>).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Get notified when you unlock new achievements (after the server cache syncs) and when you
        receive a friend request. Opening a notification goes to that game or the Friends page.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {subscribed ? (
          <button
            type="button"
            className="btn-ghost py-2 text-xs"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? "…" : "Turn off alerts"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary py-2 text-xs"
            disabled={busy || perm === "denied"}
            onClick={() => void enable()}
          >
            {busy ? "…" : "Enable achievement alerts"}
          </button>
        )}
        {perm === "denied" ? (
          <span className="text-xs text-amber-300">
            Notifications are blocked — allow them for this site in your browser settings.
          </span>
        ) : null}
      </div>
    </div>
  );
}
