"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getDoc, getFirestore, doc } from "firebase/firestore";
import app from "@/lib/firebaseClient";
import { getOrgId } from "@/lib/auth";

const ALLOWED_PLANS = new Set([
  "sc-monthly",
  "sc-pro",
  "sc-platinum",
  "diary-monthly",
]);
const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "upgrade" | "error">("loading");
  const [message, setMessage] = useState("Checking your access...");

  useEffect(() => {
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const token = new URL(window.location.href).searchParams.get("token");
    const orgId = getOrgId();

    if (!orgId) {
      window.location.href = SIGN_IN_URL;
      return;
    }

    async function evaluateAccess(uid: string, orgIdValue: string) {
      if (!uid || !orgIdValue) {
        setStatus("upgrade");
        return;
      }

      const userProfile = await getDoc(doc(firestore, "users", uid));
      const subscription = await getDoc(doc(firestore, "orgs", orgIdValue, "subscription", "current"));

      if (!userProfile.exists() || !subscription.exists()) {
        setStatus("upgrade");
        setMessage("We could not verify access for this account. Please upgrade or sign in again.");
        return;
      }

      const planId = subscription.data()?.planId as string | undefined;
      const diaryEntriesUsed = subscription.data()?.diaryEntriesUsed as number | undefined;
      const hasDiaryAccess =
        ALLOWED_PLANS.has(planId ?? "") ||
        (planId === "free-trial" && (diaryEntriesUsed ?? 0) < 1);

      if (!hasDiaryAccess) {
        window.location.href = 'https://fredconsol.co.uk/billing.html';
        return;
      }

      router.replace("/diary/new");
    }

    async function trySignIn(customToken: string) {
      try {
        await signInWithCustomToken(auth, customToken);
        const user = auth.currentUser;
        if (!user) {
          throw new Error("Authentication did not complete.");
        }

        if (!orgId) {
          setStatus("error");
          setMessage("No organisation found. Please return to FredConSol and try again.");
          return;
        }

        await evaluateAccess(user.uid, orgId);
      } catch (error) {
        setStatus("error");
        setMessage("Unable to sign in with the provided token. Please return to FredConSol and try again.");
      }
    }

    if (token) {
      trySignIn(token);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!orgId) {
          setStatus("error");
          setMessage("No organisation found. Please return to FredConSol and try again.");
          return;
        }
        evaluateAccess(user.uid, orgId);
      } else {
        window.location.href = SIGN_IN_URL;
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#1a1410] px-6 py-16 text-[#F5EFE6] sm:px-10 lg:px-20">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="rounded-3xl border border-blue-900/20 bg-[#241b15] p-10 shadow-sm">
          <h1 className="text-4xl font-semibold text-[#F5EFE6]">FredConSol Site Diary</h1>
          <p className="mt-3 max-w-2xl text-lg text-[rgb(245,239,230/.7)]">Signing you in and verifying diary access for your organisation.</p>
        </div>

        {status === "loading" ? (
          <div className="rounded-3xl border border-blue-900/20 bg-[#241b15] p-10 text-center text-[rgb(245,239,230/.7)]">
            {message}
          </div>
        ) : (
          <div className="rounded-3xl border border-blue-900/20 bg-[#241b15] p-10 text-[rgb(245,239,230/.7)]">
            <h2 className="text-2xl font-semibold text-[#F5EFE6]">Access required</h2>
            <p className="mt-4 text-base leading-7">{message}</p>
            {status === "upgrade" && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-3xl border border-blue-900/20 bg-[#20180f] p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-[rgb(245,239,230/.6)]">Upgrade offer</p>
                  <p className="mt-3 text-3xl font-semibold text-[#2563eb]">£5 / month</p>
                </div>
                <a
                  href="https://fredconsol.co.uk/dashboard.html"
                  className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  Upgrade now
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
