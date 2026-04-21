import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { FirebaseAuthError } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUidFromRequest } from "@/lib/authServer";
import { buildSteamOpenIdLoginUrl } from "@/lib/steamOpenId";

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const state = randomBytes(16).toString("hex");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;
    const returnTo = `${appUrl}/api/steam/callback?state=${encodeURIComponent(state)}`;
    const realm = appUrl;
    const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
    await adminDb().collection("steamLinkStates").doc(state).set({
      uid,
      expiresAt,
    });

    const authUrl = buildSteamOpenIdLoginUrl(returnTo, realm);
    return NextResponse.json({ authUrl });
  } catch (e) {
    console.error("[api/steam/prepare-link]", e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json(
        {
          error:
            "Missing Firebase ID token. Send Authorization: Bearer <token>, or use the in-app \"Link Steam\" button while signed in with Google.",
          code: "MISSING_BEARER_TOKEN",
        },
        { status: 401 },
      );
    }
    if (e instanceof FirebaseAuthError) {
      return NextResponse.json(
        {
          error:
            "Could not verify your session. Sign out and sign in again, or ensure FIREBASE_SERVICE_ACCOUNT_JSON is for the same Firebase project as the web app.",
          code: e.code,
          ...(isDev ? { detail: e.message } : {}),
        },
        { status: 401 },
      );
    }
    const message =
      e instanceof Error ? e.message : "Unexpected error preparing Steam link.";
    return NextResponse.json(
      {
        error: isDev
          ? message
          : "Server error while preparing Steam link. Check Firebase Admin env and Firestore.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
