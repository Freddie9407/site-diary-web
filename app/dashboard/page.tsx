"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, getFirestore, doc } from "firebase/firestore";
import app from "@/lib/firebaseClient";
import { getOrgId, signOut } from "@/lib/auth";
import { listDiaries } from "@/lib/diaryService";
import type { SiteDiary } from "@/lib/types";

const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

export default function DashboardPage() {
  const [diaries, setDiaries] = useState<SiteDiary[] | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orgId = getOrgId();
    if (!orgId) {
      window.location.href = SIGN_IN_URL;
      return;
    }

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = SIGN_IN_URL;
        return;
      }

      try {
        const [userDoc, orgDoc] = await Promise.all([
          getDoc(doc(firestore, "users", user.uid)),
          getDoc(doc(firestore, "orgs", orgId)),
        ]);

        setUserName(
          userDoc.exists()
            ? (userDoc.data()?.name as string) || user.displayName || user.email || "User"
            : user.displayName || user.email || "User",
        );

        setOrgName(orgDoc.exists() ? ((orgDoc.data()?.name as string) || orgId) : orgId);

        const items = await listDiaries(orgId);
        setDiaries(items);
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const diaryCards = diaries?.map((diary) => (
    <div
      key={diary.id}
      className="rounded-2xl border border-blue-900/20 bg-[#241b15] p-6 shadow-sm transition hover:border-blue-700/40"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[rgb(245,239,230/.6)]">{diary.dayOfWeek}</p>
          <h2 className="text-xl font-semibold text-[#F5EFE6]">{diary.projectName}</h2>
          <p className="text-sm text-[rgb(245,239,230/.6)]">{diary.date}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            diary.status === "completed"
              ? "bg-green-700/20 text-green-200"
              : "bg-yellow-700/20 text-yellow-200"
          }`}
        >
          {diary.status === "completed" ? "Completed" : "Draft"}
        </span>
      </div>

      <div className="mt-5 space-y-2 text-sm text-[rgb(245,239,230/.6)]">
        <p>
          <span className="font-semibold text-[#F5EFE6]">Weather:</span> {diary.weather?.condition || "Unknown"}
        </p>
        <p>
          <span className="font-semibold text-[#F5EFE6]">Site manager:</span> {diary.siteManager}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-full border border-blue-900/20 bg-[#1f2937] px-4 py-2 text-sm text-[#F5EFE6] transition hover:border-blue-700/40">
          View
        </button>
        <button className="rounded-full border border-blue-900/20 bg-[#1f2937] px-4 py-2 text-sm text-[#F5EFE6] transition hover:border-blue-700/40">
          Edit
        </button>
        <button className="rounded-full border border-blue-900/20 bg-[#2563eb] px-4 py-2 text-sm text-[#F5EFE6] transition hover:bg-[#1d4ed8]">
          Export PDF
        </button>
      </div>
    </div>
  ));

  return (
    <main className="min-h-screen bg-[#1a1410] px-4 py-8 text-[#F5EFE6] sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-blue-900/20 bg-[#241b15] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-lg font-semibold text-white">F</div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[rgb(245,239,230/.6)]">FredConSol</p>
              <p className="text-2xl font-semibold text-[#F5EFE6]">{orgName || "Organization"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-sm text-[rgb(245,239,230/.6)]">Signed in as</p>
            <p className="text-lg font-semibold text-[#F5EFE6]">{userName || "Loading…"}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://fredconsol.co.uk/dashboard.html"
                className="rounded-full bg-transparent px-4 py-2 text-sm text-[#F5EFE6] transition hover:text-[#ea580c]"
              >
                ← Back to Main Dashboard
              </a>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-3xl border border-blue-900/20 bg-[#241b15] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[rgb(245,239,230/.6)]">Diary dashboard</p>
            <h1 className="text-3xl font-semibold text-[#F5EFE6]">Site diary entries</h1>
          </div>
          <button
            type="button"
            className="rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            New Diary Entry
          </button>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-blue-900/20 bg-[#241b15] p-10 text-center text-[rgb(245,239,230/.6)]">
            Loading diary entries…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-600/20 bg-[#241b15] p-10 text-center text-red-300">
            {error}
          </div>
        ) : diaries && diaries.length > 0 ? (
          <div className="grid gap-6">{diaryCards}</div>
        ) : (
          <div className="rounded-3xl border border-blue-900/20 bg-[#241b15] p-10 text-center text-[rgb(245,239,230/.6)]">
            <p className="text-lg font-semibold text-[#F5EFE6]">No diary entries yet.</p>
            <p className="mt-2 max-w-2xl mx-auto">Create a new diary entry to keep your site records up to date.</p>
            <button
              type="button"
              className="mt-6 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              New Entry
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
