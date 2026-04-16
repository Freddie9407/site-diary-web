"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "@/lib/firebaseClient";
import { getOrgId } from "@/lib/auth";
import { createDiary, saveDiary, listDiaries } from "@/lib/diaryService";
import type { SiteDiary } from "@/lib/types";

const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

const SHIFT_TYPES = ["Day Shift", "Night Shift", "Split Shift", "Weekend", "Other"];
const INCIDENT_TYPES = ["incident", "near-miss", "accident"];

const inputCls =
  "mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none";
const inlineCls =
  "rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none";
const addBtn =
  "rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]";
const delBtn =
  "rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700";
const sectionHeading =
  "mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#2563eb] pb-2";

type PlantCheckStatus = "not-checked" | "serviceable" | "issue";

type WorkerRow = { id: string; trade: string; numberOfWorkers: number; company: string };
type VisitorRow = { id: string; name: string; company: string; purpose: string };
type ActivityRow = { id: string; description: string };
type MilestoneRow = { id: string; text: string };
type PlantOnSiteRow = { id: string; item: string; supplier?: string; checkStatus: PlantCheckStatus; notes?: string };
type PlantOffHireRow = { id: string; item: string; date: string; notes?: string };
type PlantBreakdownRow = { id: string; item: string; issue: string; actionTaken?: string };
type PlantDeliveryRow = { id: string; item: string; date: string; notes?: string; photoUrls?: string[] };
type IncidentRow = { id: string; type: "incident" | "near-miss" | "accident"; description: string; injured?: string; actionTaken?: string };
type ToolboxRow = { id: string; topic: string };

type PreviousDiary = {
  id: string;
  date: string;
  projectName: string;
  plantOnSite: PlantOnSiteRow[];
};

export default function NewDiaryPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [diaryId, setDiaryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic Info
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [shiftType, setShiftType] = useState("Day Shift");
  const [siteManager, setSiteManager] = useState("");

  // Weather (in Basic Info)
  const [weatherCondition, setWeatherCondition] = useState("");
  const [weatherNotApplicable, setWeatherNotApplicable] = useState(false);
  const [weatherRemarks, setWeatherRemarks] = useState("");

  // Labour & Personnel
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [subcontractors, setSubcontractors] = useState<WorkerRow[]>([]);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);

  // Work Activities
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);

  // Plant & Materials
  const [plantOnSite, setPlantOnSite] = useState<PlantOnSiteRow[]>([]);
  const [plantOffHired, setPlantOffHired] = useState<PlantOffHireRow[]>([]);
  const [plantBreakdowns, setPlantBreakdowns] = useState<PlantBreakdownRow[]>([]);
  const [plantDeliveries, setPlantDeliveries] = useState<PlantDeliveryRow[]>([]);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [previousDiaries, setPreviousDiaries] = useState<PreviousDiary[]>([]);
  const [loadingPreviousDiaries, setLoadingPreviousDiaries] = useState(false);

  // Health & Safety
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxRow[]>([]);

  // Photos
  const [photos] = useState<Array<{ id: string; url: string; caption?: string; uploadedAt: string }>>([]);

  // Additional Notes
  const [notes, setNotes] = useState("");

  // Sign-off
  const [signoffCompletedBy, setSignoffCompletedBy] = useState("");
  const [signoffTitle, setSignoffTitle] = useState("");
  const [signoffDate, setSignoffDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const oid = getOrgId();
    if (!oid) {
      window.location.href = SIGN_IN_URL;
      return;
    }
    setOrgId(oid);

    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = SIGN_IN_URL;
        return;
      }
      setUserId(user.uid);
    });

    return () => unsubscribe();
  }, []);

  const openImportModal = async () => {
    if (!orgId) return;
    setShowImportModal(true);
    setLoadingPreviousDiaries(true);
    try {
      const all = await listDiaries(orgId);
      setPreviousDiaries(
        all
          .filter((d) => d.id !== diaryId)
          .map((d) => ({
            id: d.id!,
            date: d.date,
            projectName: d.projectName,
            plantOnSite: (d.plantOnSite ?? []).map((p) => ({
              ...p,
              checkStatus: (
                (p.checkStatus as string) === "ok" ? "serviceable" : p.checkStatus
              ) as PlantCheckStatus,
            })),
          }))
      );
    } catch {
      // ignore
    } finally {
      setLoadingPreviousDiaries(false);
    }
  };

  const importPlantFromDiary = (diary: PreviousDiary) => {
    setPlantOnSite([
      ...plantOnSite,
      ...diary.plantOnSite.map((p) => ({
        ...p,
        id: `${Date.now()}-${Math.random()}`,
      })),
    ]);
    setShowImportModal(false);
  };

  const buildData = (status: "draft" | "completed"): Partial<SiteDiary> => ({
    status,
    projectName,
    siteAddress,
    date,
    shiftType,
    weather: {
      condition: weatherCondition,
      notApplicable: weatherNotApplicable,
      additionalRemarks: weatherRemarks,
    },
    siteManager,
    workers,
    subcontractors,
    visitors,
    activities,
    milestones: milestones.map((m) => m.text),
    plantOnSite,
    plantOffHired,
    plantBreakdowns,
    plantDeliveries,
    incidents,
    toolboxTalks,
    photos,
    notes,
    signoff: {
      completedBy: signoffCompletedBy,
      title: signoffTitle,
      date: signoffDate,
    },
  });

  const saveDraft = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    try {
      const data = buildData("draft");
      if (diaryId) {
        await saveDiary(orgId, diaryId, data);
      } else {
        const newId = await createDiary(orgId, userId, data);
        setDiaryId(newId);
      }
      alert("Draft saved!");
    } catch {
      alert("Error saving draft");
    } finally {
      setSaving(false);
    }
  };

  const completeAndExport = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    try {
      const data = buildData("completed");
      if (diaryId) {
        await saveDiary(orgId, diaryId, data);
      } else {
        const newId = await createDiary(orgId, userId, data);
        setDiaryId(newId);
      }
      // TODO: Export PDF
      alert("Diary completed! PDF export coming soon.");
    } catch {
      alert("Error completing diary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1410] text-[#F5EFE6]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-blue-900/20 bg-[#241b15] px-4 py-4 shadow-sm sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a
            href="https://fredconsol.co.uk/dashboard.html"
            className="text-[#F5EFE6] hover:text-[#2563eb]"
          >
            ← Dashboard
          </a>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={completeAndExport}
              disabled={saving}
              className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              Complete & Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-4xl space-y-12">

          {/* ── Basic Info ─────────────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Site Address</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Shift Type</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className={inputCls}
                >
                  {SHIFT_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Site Manager</label>
                <input
                  type="text"
                  value={siteManager}
                  onChange={(e) => setSiteManager(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">
                    Weather Condition
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[rgb(245,239,230/.6)]">
                    <input
                      type="checkbox"
                      checked={weatherNotApplicable}
                      onChange={(e) => setWeatherNotApplicable(e.target.checked)}
                      className="rounded border border-blue-900/20 bg-[#241b15]"
                    />
                    Not Applicable
                  </label>
                </div>
                <input
                  type="text"
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  disabled={weatherNotApplicable}
                  placeholder="e.g. Overcast, Light Rain"
                  className={`${inputCls} ${weatherNotApplicable ? "cursor-not-allowed opacity-40" : ""}`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">
                  Additional Weather Remarks
                </label>
                <input
                  type="text"
                  value={weatherRemarks}
                  onChange={(e) => setWeatherRemarks(e.target.value)}
                  placeholder="e.g. Temp 12°C, Wind 25mph, Heavy rain until 10am"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* ── Labour & Personnel ─────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Labour & Personnel</h2>
            <div className="space-y-6">

              {/* Workers */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Workers ({workers.length})</h3>
                  <button
                    onClick={() =>
                      setWorkers([...workers, { id: Date.now().toString(), trade: "", numberOfWorkers: 1, company: "" }])
                    }
                    className={addBtn}
                  >
                    Add Worker
                  </button>
                </div>
                {workers.map((worker, index) => (
                  <div key={worker.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Trade / Type (e.g. Joiner, Labourer)"
                      value={worker.trade}
                      onChange={(e) => {
                        const n = [...workers];
                        n[index].trade = e.target.value;
                        setWorkers(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="number"
                      placeholder="Number of Workers"
                      min={1}
                      value={worker.numberOfWorkers}
                      onChange={(e) => {
                        const n = [...workers];
                        n[index].numberOfWorkers = parseInt(e.target.value) || 1;
                        setWorkers(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={worker.company}
                      onChange={(e) => {
                        const n = [...workers];
                        n[index].company = e.target.value;
                        setWorkers(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setWorkers(workers.filter((w) => w.id !== worker.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Subcontractors */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Subcontractors ({subcontractors.length})</h3>
                  <button
                    onClick={() =>
                      setSubcontractors([...subcontractors, { id: Date.now().toString(), trade: "", numberOfWorkers: 1, company: "" }])
                    }
                    className={addBtn}
                  >
                    Add Subcontractor
                  </button>
                </div>
                {subcontractors.map((sub, index) => (
                  <div key={sub.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Trade / Type (e.g. Joiner, Labourer)"
                      value={sub.trade}
                      onChange={(e) => {
                        const n = [...subcontractors];
                        n[index].trade = e.target.value;
                        setSubcontractors(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="number"
                      placeholder="Number of Workers"
                      min={1}
                      value={sub.numberOfWorkers}
                      onChange={(e) => {
                        const n = [...subcontractors];
                        n[index].numberOfWorkers = parseInt(e.target.value) || 1;
                        setSubcontractors(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={sub.company}
                      onChange={(e) => {
                        const n = [...subcontractors];
                        n[index].company = e.target.value;
                        setSubcontractors(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setSubcontractors(subcontractors.filter((s) => s.id !== sub.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Visitors */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Visitors ({visitors.length})</h3>
                  <button
                    onClick={() =>
                      setVisitors([...visitors, { id: Date.now().toString(), name: "", company: "", purpose: "" }])
                    }
                    className={addBtn}
                  >
                    Add Visitor
                  </button>
                </div>
                {visitors.map((visitor, index) => (
                  <div key={visitor.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={visitor.name}
                      onChange={(e) => {
                        const n = [...visitors];
                        n[index].name = e.target.value;
                        setVisitors(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={visitor.company}
                      onChange={(e) => {
                        const n = [...visitors];
                        n[index].company = e.target.value;
                        setVisitors(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Purpose"
                      value={visitor.purpose}
                      onChange={(e) => {
                        const n = [...visitors];
                        n[index].purpose = e.target.value;
                        setVisitors(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setVisitors(visitors.filter((v) => v.id !== visitor.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Work Activities ────────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Work Activities</h2>
            <div className="space-y-6">

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Activities ({activities.length})</h3>
                  <button
                    onClick={() =>
                      setActivities([...activities, { id: Date.now().toString(), description: "" }])
                    }
                    className={addBtn}
                  >
                    Add Activity
                  </button>
                </div>
                {activities.map((activity, index) => (
                  <div key={activity.id} className="mb-4 flex gap-3">
                    <input
                      type="text"
                      placeholder="Description of work carried out"
                      value={activity.description}
                      onChange={(e) => {
                        const n = [...activities];
                        n[index].description = e.target.value;
                        setActivities(n);
                      }}
                      className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => setActivities(activities.filter((a) => a.id !== activity.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Milestones ({milestones.length})</h3>
                  <button
                    onClick={() =>
                      setMilestones([...milestones, { id: Date.now().toString(), text: "" }])
                    }
                    className={addBtn}
                  >
                    Add Milestone
                  </button>
                </div>
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="mb-3 flex gap-3">
                    <input
                      type="text"
                      placeholder="Milestone description"
                      value={milestone.text}
                      onChange={(e) => {
                        const n = [...milestones];
                        n[index].text = e.target.value;
                        setMilestones(n);
                      }}
                      className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => setMilestones(milestones.filter((m) => m.id !== milestone.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Plant & Materials ──────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Plant & Materials</h2>
            <div className="space-y-8">

              {/* On Site */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">On Site ({plantOnSite.length})</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={openImportModal}
                      className="rounded-full border border-blue-900/30 px-3 py-1 text-sm font-medium text-[#F5EFE6] transition hover:border-blue-700/50 hover:bg-[#241b15]"
                    >
                      Import from Previous Diary
                    </button>
                    <button
                      onClick={() =>
                        setPlantOnSite([
                          ...plantOnSite,
                          { id: Date.now().toString(), item: "", supplier: "", checkStatus: "not-checked", notes: "" },
                        ])
                      }
                      className={addBtn}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
                {plantOnSite.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Item"
                      value={item.item}
                      onChange={(e) => {
                        const n = [...plantOnSite];
                        n[index].item = e.target.value;
                        setPlantOnSite(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Supplier"
                      value={item.supplier || ""}
                      onChange={(e) => {
                        const n = [...plantOnSite];
                        n[index].supplier = e.target.value;
                        setPlantOnSite(n);
                      }}
                      className={inlineCls}
                    />
                    {/* Toggle pill buttons */}
                    <div className="flex overflow-hidden rounded-md border border-blue-900/20">
                      {(["not-checked", "serviceable", "issue"] as PlantCheckStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            const n = [...plantOnSite];
                            n[index].checkStatus = status;
                            setPlantOnSite(n);
                          }}
                          className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                            item.checkStatus === status
                              ? status === "issue"
                                ? "bg-red-600 text-white"
                                : status === "serviceable"
                                ? "bg-green-700 text-white"
                                : "bg-blue-900/60 text-[#F5EFE6]"
                              : "bg-[#241b15] text-[rgb(245,239,230/.5)] hover:bg-[#2a2018]"
                          }`}
                        >
                          {status === "not-checked"
                            ? "Not Checked"
                            : status === "serviceable"
                            ? "Serviceable"
                            : "Issue"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const n = [...plantOnSite];
                        n[index].notes = e.target.value;
                        setPlantOnSite(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setPlantOnSite(plantOnSite.filter((p) => p.id !== item.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Off Hired */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Off Hired ({plantOffHired.length})</h3>
                  <button
                    onClick={() =>
                      setPlantOffHired([
                        ...plantOffHired,
                        { id: Date.now().toString(), item: "", date: new Date().toISOString().split("T")[0], notes: "" },
                      ])
                    }
                    className={addBtn}
                  >
                    Add Item
                  </button>
                </div>
                {plantOffHired.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Item"
                      value={item.item}
                      onChange={(e) => {
                        const n = [...plantOffHired];
                        n[index].item = e.target.value;
                        setPlantOffHired(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => {
                        const n = [...plantOffHired];
                        n[index].date = e.target.value;
                        setPlantOffHired(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const n = [...plantOffHired];
                        n[index].notes = e.target.value;
                        setPlantOffHired(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setPlantOffHired(plantOffHired.filter((p) => p.id !== item.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Breakdowns */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Breakdowns ({plantBreakdowns.length})</h3>
                  <button
                    onClick={() =>
                      setPlantBreakdowns([
                        ...plantBreakdowns,
                        { id: Date.now().toString(), item: "", issue: "", actionTaken: "" },
                      ])
                    }
                    className={addBtn}
                  >
                    Add Breakdown
                  </button>
                </div>
                {plantBreakdowns.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Item"
                      value={item.item}
                      onChange={(e) => {
                        const n = [...plantBreakdowns];
                        n[index].item = e.target.value;
                        setPlantBreakdowns(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Issue"
                      value={item.issue}
                      onChange={(e) => {
                        const n = [...plantBreakdowns];
                        n[index].issue = e.target.value;
                        setPlantBreakdowns(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Action Taken"
                      value={item.actionTaken || ""}
                      onChange={(e) => {
                        const n = [...plantBreakdowns];
                        n[index].actionTaken = e.target.value;
                        setPlantBreakdowns(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setPlantBreakdowns(plantBreakdowns.filter((p) => p.id !== item.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Deliveries */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Deliveries ({plantDeliveries.length})</h3>
                  <button
                    onClick={() =>
                      setPlantDeliveries([
                        ...plantDeliveries,
                        {
                          id: Date.now().toString(),
                          item: "",
                          date: new Date().toISOString().split("T")[0],
                          notes: "",
                          photoUrls: [],
                        },
                      ])
                    }
                    className={addBtn}
                  >
                    Add Delivery
                  </button>
                </div>
                {plantDeliveries.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Item"
                      value={item.item}
                      onChange={(e) => {
                        const n = [...plantDeliveries];
                        n[index].item = e.target.value;
                        setPlantDeliveries(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => {
                        const n = [...plantDeliveries];
                        n[index].date = e.target.value;
                        setPlantDeliveries(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const n = [...plantDeliveries];
                        n[index].notes = e.target.value;
                        setPlantDeliveries(n);
                      }}
                      className={inlineCls}
                    />
                    <div className="flex gap-2">
                      <button className="flex-1 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]">
                        Upload Photo
                      </button>
                      <button
                        onClick={() => setPlantDeliveries(plantDeliveries.filter((p) => p.id !== item.id))}
                        className={delBtn}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Health & Safety ────────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Health & Safety</h2>
            <div className="space-y-6">

              {/* Incidents */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Incidents ({incidents.length})</h3>
                  <button
                    onClick={() =>
                      setIncidents([
                        ...incidents,
                        { id: Date.now().toString(), type: "incident", description: "", injured: "", actionTaken: "" },
                      ])
                    }
                    className={addBtn}
                  >
                    Add Incident
                  </button>
                </div>
                {incidents.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const n = [...incidents];
                        n[index].type = e.target.value as "incident" | "near-miss" | "accident";
                        setIncidents(n);
                      }}
                      className={inlineCls}
                    >
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const n = [...incidents];
                        n[index].description = e.target.value;
                        setIncidents(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Injured Party"
                      value={item.injured || ""}
                      onChange={(e) => {
                        const n = [...incidents];
                        n[index].injured = e.target.value;
                        setIncidents(n);
                      }}
                      className={inlineCls}
                    />
                    <input
                      type="text"
                      placeholder="Action Taken"
                      value={item.actionTaken || ""}
                      onChange={(e) => {
                        const n = [...incidents];
                        n[index].actionTaken = e.target.value;
                        setIncidents(n);
                      }}
                      className={inlineCls}
                    />
                    <button
                      onClick={() => setIncidents(incidents.filter((i) => i.id !== item.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Toolbox Talks */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Toolbox Talks ({toolboxTalks.length})</h3>
                  <button
                    onClick={() =>
                      setToolboxTalks([...toolboxTalks, { id: crypto.randomUUID(), topic: "" }])
                    }
                    className={addBtn}
                  >
                    Add Talk
                  </button>
                </div>
                {toolboxTalks.map((item, index) => (
                  <div key={item.id} className="mb-3 flex gap-3">
                    <input
                      type="text"
                      placeholder="Topic"
                      value={item.topic}
                      onChange={(e) => {
                        const n = [...toolboxTalks];
                        n[index].topic = e.target.value;
                        setToolboxTalks(n);
                      }}
                      className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => setToolboxTalks(toolboxTalks.filter((t) => t.id !== item.id))}
                      className={delBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Photos ─────────────────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Photos</h2>
            <div className="space-y-4">
              <button className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]">
                Upload Photos
              </button>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg border border-blue-900/20 bg-[#241b15] p-4">
                    <img src={photo.url} alt={photo.caption || "Photo"} className="h-24 w-full rounded object-cover" />
                    <p className="mt-2 text-sm text-[rgb(245,239,230/.6)]">{photo.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Additional Notes ───────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Additional Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={6}
              className="w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
            />
          </section>

          {/* ── Sign-off ────────────────────────────────────  */}
          <section>
            <h2 className={sectionHeading}>Sign-off</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Completed By</label>
                <input
                  type="text"
                  value={signoffCompletedBy}
                  onChange={(e) => setSignoffCompletedBy(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Job Title</label>
                <input
                  type="text"
                  value={signoffTitle}
                  onChange={(e) => setSignoffTitle(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Date</label>
                <input
                  type="date"
                  value={signoffDate}
                  onChange={(e) => setSignoffDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Signature</label>
                <button className="mt-1 w-full rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]">
                  Upload Signature
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ── Import from Previous Diary Modal ──────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/20 bg-[#241b15] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#F5EFE6]">
                Import Plant from Previous Diary
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[rgb(245,239,230/.6)] hover:text-[#F5EFE6]"
              >
                ✕
              </button>
            </div>
            {loadingPreviousDiaries ? (
              <p className="text-[rgb(245,239,230/.6)]">Loading previous diaries...</p>
            ) : previousDiaries.length === 0 ? (
              <p className="text-[rgb(245,239,230/.6)]">No previous diaries found.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {previousDiaries.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => importPlantFromDiary(d)}
                    className="w-full rounded-lg border border-blue-900/20 bg-[#20180f] px-4 py-3 text-left text-[#F5EFE6] transition hover:border-blue-700/40 hover:bg-[#241b15]"
                  >
                    <span className="font-medium">{d.projectName || "Unnamed"}</span>
                    <span className="ml-3 text-sm text-[rgb(245,239,230/.6)]">{d.date}</span>
                    <span className="ml-3 text-sm text-[rgb(245,239,230/.6)]">
                      {d.plantOnSite.length} item{d.plantOnSite.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowImportModal(false)}
              className="mt-4 rounded-full border border-blue-900/30 px-4 py-2 text-sm text-[#F5EFE6] transition hover:border-blue-700/50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
