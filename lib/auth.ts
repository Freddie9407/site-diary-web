import { getAuth, signOut as firebaseSignOut, type User } from "firebase/auth";
import app from "./firebaseClient";

const auth = getAuth(app);
const ORG_ID_KEY = "siteDiaryOrgId";
const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function getOrgId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const urlOrgId = new URL(window.location.href).searchParams.get("orgId");
  if (urlOrgId) {
    localStorage.setItem(ORG_ID_KEY, urlOrgId);
    return urlOrgId;
  }

  return localStorage.getItem(ORG_ID_KEY);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);

  if (typeof window !== "undefined") {
    window.location.href = SIGN_IN_URL;
  }
}

export function getAuthInstance() {
  return auth;
}
