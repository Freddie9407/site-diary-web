"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import app from "@/lib/firebaseClient";
import { getOrgId } from "@/lib/auth";
import { createDiary, saveDiary, listDiaries } from "@/lib/diaryService";
import type { PhotoEntry, SiteDiary } from "@/lib/types";
import { generateDiaryPDF } from "@/lib/pdfGenerator";

const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

const SHIFT_TYPES = ["Day Shift", "Night Shift", "Split Shift", "Weekend", "Other"];
const INCIDENT_TYPES = ["incident", "near-miss", "accident"];
const WEATHER_CONDITIONS = [
  "Sunny", "Partly Cloudy", "Overcast", "Light Rain", "Heavy Rain",
  "Thunderstorm", "Snow", "Frost/Ice", "Fog", "High Wind", "Not Applicable",
];

const inputCls =
  "mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40";
const dateCls =
  "mt-1 w-auto rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40";
const inlineCls =
  "rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40";
const inlineDateCls =
  "w-auto rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40";
const addBtn =
  "rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]";
const labelCls = "block text-sm font-medium text-[#F5EFE6]/60";
const sectionHeading =
  "mb-6 border-l-[3px] border-[#2563eb] pl-3 text-2xl font-semibold text-[#F5EFE6]";

function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-center p-1 text-red-400 transition hover:text-red-300"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

type WorkerRow = { id: string; trade: string; numberOfWorkers: number; company: string };
type VisitorRow = { id: string; name: string; company: string; purpose: string };
type ActivityRow = { id: string; description: string };
type MilestoneRow = { id: string; text: string };
type PlantOnSiteRow = { id: string; item: string; supplier?: string; issue?: string };
type PlantOffHireRow = { id: string; item: string; date: string; notes?: string };
type PlantBreakdownRow = { id: string; item: string; issue: string; actionTaken?: string };
type PlantDeliveryRow = { id: string; item: string; date: string; notes?: string; photoUrls?: string[] };
type IncidentRow = { id: string; type: "incident" | "near-miss" | "accident"; description: string; injured?: string; actionTaken?: string };
type ToolboxRow = { id: string; topic: string; remarks?: string; showRemarks?: boolean };
type PhotoRow = PhotoEntry & { uploading?: boolean };
type RamsDoc = { id: string; documentRef: string; projectName: string; siteAddress?: string; preparedBy?: string };
type PreviousDiary = { id: string; date: string; projectName: string; plantOnSite: PlantOnSiteRow[] };

function getCanvasPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if ("touches" in e) {
    const t = e.touches[0];
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
  }
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

export default function NewDiaryPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [diaryId, setDiaryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRender = useRef(true);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3500);
  };

  // Basic Info
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [shiftType, setShiftType] = useState("Day Shift");
  const [siteManager, setSiteManager] = useState("");

  // Linked RAMS
  const [allRamsDocs, setAllRamsDocs] = useState<RamsDoc[]>([]);
  const [ramsQuery, setRamsQuery] = useState("");
  const [ramsOpen, setRamsOpen] = useState(false);
  const [linkedRamsId, setLinkedRamsId] = useState("");
  const [linkedRamsTitle, setLinkedRamsTitle] = useState("");
  const [linkedRamsRef, setLinkedRamsRef] = useState("");
  const ramsInputRef = useRef<HTMLInputElement>(null);

  // Weather
  const [weatherCondition, setWeatherCondition] = useState("");
  const [weatherRemarks, setWeatherRemarks] = useState("");

  // Labour & Personnel
  const [newInductees, setNewInductees] = useState(0);
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

  // Photos (general)
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery photo upload (shared single input, index tracked via ref)
  const deliveryPhotoInputRef = useRef<HTMLInputElement>(null);
  const deliveryUploadIndexRef = useRef<number>(-1);

  // Additional Notes
  const [notes, setNotes] = useState("");

  // Sign-off — canvas only
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const sigLastPos = useRef({ x: 0, y: 0 });

  // ── Auth & orgId ──────────────────────────────────────────
  useEffect(() => {
    const oid = getOrgId();
    if (!oid) { window.location.href = SIGN_IN_URL; return; }
    setOrgId(oid);
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { window.location.href = SIGN_IN_URL; return; }
      setUserId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  // ── Fetch RAMS documents ───────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    const db = getFirestore(app);
    getDocs(query(collection(db, "orgs", orgId, "documents"), where("status", "in", ["completed", "in-progress"])))
      .then((snap) => {
        setAllRamsDocs(
          snap.docs.map((d) => ({
            id: d.id,
            documentRef: (d.data().documentRef as string) || "",
            projectName: (d.data().projectName as string) || (d.data().title as string) || "",
            siteAddress: (d.data().siteAddress as string) || "",
            preparedBy: (d.data().preparedBy as string) || "",
          })),
        );
      })
      .catch(() => {});
  }, [orgId]);

  // ── Track unsaved changes ──────────────────────────────────
  useEffect(() => {
    if (isInitialRender.current) { isInitialRender.current = false; return; }
    setHasUnsavedChanges(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, siteAddress, date, shiftType, siteManager, weatherCondition, weatherRemarks,
      linkedRamsId, newInductees, workers, subcontractors, visitors, activities, milestones,
      plantOnSite, plantOffHired, plantBreakdowns, plantDeliveries, incidents, toolboxTalks,
      photos, notes, signatureDataUrl]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Minimal draft payload for auto-create on upload ───────
  const minimalDraft = useCallback(
    (): Partial<SiteDiary> => ({
      status: "draft",
      projectName,
      siteAddress,
      date,
      shiftType,
      siteManager,
      weather: { condition: weatherCondition, notApplicable: weatherCondition === "Not Applicable" },
      workers: [],
      subcontractors: [],
      visitors: [],
      activities: [],
      milestones: [],
      plantOnSite: [],
      plantOffHired: [],
      plantBreakdowns: [],
      plantDeliveries: [],
      incidents: [],
      toolboxTalks: [],
      photos: [],
      notes: "",
      signoff: { completedBy: "", title: "", date: new Date().toISOString().split("T")[0] },
    }),
    [projectName, siteAddress, date, shiftType, siteManager, weatherCondition],
  );

  // ── General photo upload ───────────────────────────────────
  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (!orgId) return;
      const tempId = `tmp-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [
        ...prev,
        { id: tempId, url: previewUrl, caption: "", uploadedAt: new Date().toISOString(), uploading: true },
      ]);
      try {
        let dId = diaryId;
        if (!dId && userId) {
          dId = await createDiary(orgId, userId, minimalDraft());
          setDiaryId(dId);
        }
        if (!dId) throw new Error("No diary ID");
        const storage = getStorage(app);
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${Date.now()}.${ext}`;
        const photoRef = storageRef(storage, `orgs/${orgId}/siteDiaries/${dId}/photos/${filename}`);
        await uploadBytes(photoRef, file);
        const downloadUrl = await getDownloadURL(photoRef);
        URL.revokeObjectURL(previewUrl);
        setPhotos((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id: filename, url: downloadUrl, uploading: false } : p)),
        );
      } catch {
        URL.revokeObjectURL(previewUrl);
        setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        alert("Photo upload failed — please try again.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, userId, diaryId, minimalDraft],
  );

  // ── Delivery photo upload ──────────────────────────────────
  const handleDeliveryPhoto = useCallback(
    async (file: File, deliveryIdx: number) => {
      if (!orgId) return;
      const tempUrl = URL.createObjectURL(file);
      setPlantDeliveries((prev) =>
        prev.map((d, i) => (i === deliveryIdx ? { ...d, photoUrls: [...(d.photoUrls || []), tempUrl] } : d)),
      );
      try {
        let dId = diaryId;
        if (!dId && userId) {
          dId = await createDiary(orgId, userId, minimalDraft());
          setDiaryId(dId);
        }
        if (!dId) throw new Error("No diary ID");
        const storage = getStorage(app);
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `delivery-${Date.now()}.${ext}`;
        const photoRef = storageRef(storage, `orgs/${orgId}/siteDiaries/photos/${filename}`);
        await uploadBytes(photoRef, file);
        const downloadUrl = await getDownloadURL(photoRef);
        URL.revokeObjectURL(tempUrl);
        setPlantDeliveries((prev) =>
          prev.map((d, i) =>
            i === deliveryIdx
              ? { ...d, photoUrls: (d.photoUrls || []).map((u) => (u === tempUrl ? downloadUrl : u)) }
              : d,
          ),
        );
      } catch {
        URL.revokeObjectURL(tempUrl);
        setPlantDeliveries((prev) =>
          prev.map((d, i) =>
            i === deliveryIdx ? { ...d, photoUrls: (d.photoUrls || []).filter((u) => u !== tempUrl) } : d,
          ),
        );
        alert("Photo upload failed — please try again.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, userId, diaryId, minimalDraft],
  );

  // ── Signature canvas ───────────────────────────────────────
  const startSigDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    sigDrawing.current = true;
    sigLastPos.current = getCanvasPos(canvasRef.current, e);
  };
  const drawSig = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sigDrawing.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    sigLastPos.current = pos;
  };
  const stopSigDraw = () => {
    if (!sigDrawing.current) return;
    sigDrawing.current = false;
    setSignatureDataUrl(canvasRef.current?.toDataURL() ?? "");
  };
  const clearSig = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureDataUrl("");
  };

  // ── Import plant modal ─────────────────────────────────────
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
              id: p.id,
              item: p.item,
              supplier: p.supplier,
              issue: p.issue,
            })),
          })),
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
      ...diary.plantOnSite.map((p) => ({ ...p, id: `${Date.now()}-${Math.random()}` })),
    ]);
    setShowImportModal(false);
  };

  // ── Build save payload ─────────────────────────────────────
  const buildData = (status: "draft" | "completed"): Partial<SiteDiary> => ({
    status,
    projectName,
    siteAddress,
    date,
    shiftType,
    weather: {
      condition: weatherCondition,
      notApplicable: weatherCondition === "Not Applicable",
      additionalRemarks: weatherRemarks,
    },
    siteManager,
    linkedRamsId: linkedRamsId || undefined,
    linkedRamsTitle: linkedRamsTitle || undefined,
    linkedRamsRef: linkedRamsRef || undefined,
    newInductees,
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
    toolboxTalks: toolboxTalks.map(({ showRemarks: _sr, ...t }) => t),
    photos: photos.filter((p) => !p.uploading).map(({ uploading: _u, ...p }) => p as PhotoEntry),
    notes,
    signoff: {
      completedBy: "",
      title: "",
      date: new Date().toISOString().split("T")[0],
      signatureUrl: signatureDataUrl || undefined,
    },
  });

  const saveDraft = async () => {
    console.log('[SiteDiary] Save called — orgId:', orgId, 'diaryId:', diaryId, 'userId:', userId);
    if (!orgId || !userId) {
      showToast('Cannot save — not authenticated. Please refresh and try again.');
      return;
    }
    setSaving(true);
    try {
      const data = buildData("draft");
      if (diaryId) {
        await saveDiary(orgId, diaryId, data);
      } else {
        const newId = await createDiary(orgId, userId, data);
        setDiaryId(newId);
      }
      setHasUnsavedChanges(false);
      showToast('Draft saved successfully');
    } catch (err) {
      console.error('[SiteDiary] Save failed:', err);
      showToast('Error saving draft — check console for details');
    } finally {
      setSaving(false);
    }
  };

  const completeAndExport = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    try {
      const data = buildData("completed");
      let dId = diaryId;
      if (dId) {
        await saveDiary(orgId, dId, data);
      } else {
        dId = await createDiary(orgId, userId, data);
        setDiaryId(dId);
      }
      setHasUnsavedChanges(false);
      generateDiaryPDF(data);
    } catch {
      alert("Error completing diary");
    } finally {
      setSaving(false);
    }
  };

  // ── JSX ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1410] text-[#F5EFE6]">

      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-blue-900/20 bg-[#241b15] px-4 py-4 shadow-sm sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="https://fredconsol.co.uk/dashboard.html" className="text-[#F5EFE6] hover:text-[#2563eb]">
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
            <div className="grid gap-6 sm:grid-cols-2">

              {/* Linked RAMS Document — top of form */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Linked RAMS Document</label>
                {linkedRamsId ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-blue-900/40 px-3 py-1 text-sm font-medium text-blue-200">
                      Linked: {linkedRamsRef}
                    </span>
                    <span className="text-sm text-[rgb(245,239,230/.6)]">{linkedRamsTitle}</span>
                    <button
                      type="button"
                      onClick={() => { setLinkedRamsId(""); setLinkedRamsTitle(""); setLinkedRamsRef(""); setRamsQuery(""); }}
                      className="text-sm text-[rgb(245,239,230/.4)] hover:text-[#F5EFE6]"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <input
                      ref={ramsInputRef}
                      type="text"
                      value={ramsQuery}
                      onChange={(e) => { setRamsQuery(e.target.value); setRamsOpen(true); }}
                      onFocus={() => setRamsOpen(true)}
                      onBlur={() => setTimeout(() => setRamsOpen(false), 150)}
                      placeholder="Search RAMS documents…"
                      className={inputCls}
                    />
                    {ramsOpen && (
                      <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-blue-900/30 bg-[#1a1410] shadow-lg">
                        <li>
                          <button
                            type="button"
                            onMouseDown={() => { setLinkedRamsId(""); setLinkedRamsTitle(""); setLinkedRamsRef(""); setRamsQuery(""); setRamsOpen(false); }}
                            className="w-full px-4 py-2 text-left text-sm text-[rgb(245,239,230/.5)] hover:bg-[#241b15]"
                          >
                            None
                          </button>
                        </li>
                        {allRamsDocs
                          .filter((d) => {
                            const q = ramsQuery.toLowerCase();
                            return !q || d.documentRef.toLowerCase().includes(q) || d.projectName.toLowerCase().includes(q) || (d.siteAddress || "").toLowerCase().includes(q);
                          })
                          .map((d) => (
                            <li key={d.id}>
                              <button
                                type="button"
                                onMouseDown={() => {
                                  setLinkedRamsId(d.id);
                                  setLinkedRamsRef(d.documentRef);
                                  setLinkedRamsTitle(d.projectName);
                                  if (d.projectName) setProjectName(d.projectName);
                                  if (d.siteAddress) setSiteAddress(d.siteAddress);
                                  if (d.preparedBy) setSiteManager(d.preparedBy);
                                  setRamsQuery("");
                                  setRamsOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-[#F5EFE6] hover:bg-[#241b15]"
                              >
                                <span className="font-medium">{d.projectName || "Untitled"}</span>
                                {d.siteAddress && <span className="ml-2 text-[rgb(245,239,230/.6)]">— {d.siteAddress}</span>}
                                {d.documentRef && <span className="ml-2 text-xs text-[rgb(245,239,230/.4)]">({d.documentRef})</span>}
                              </button>
                            </li>
                          ))}
                        {allRamsDocs.filter((d) => {
                          const q = ramsQuery.toLowerCase();
                          return !q || d.documentRef.toLowerCase().includes(q) || d.projectName.toLowerCase().includes(q) || (d.siteAddress || "").toLowerCase().includes(q);
                        }).length === 0 && ramsQuery && (
                          <li className="px-4 py-2 text-sm text-[rgb(245,239,230/.4)]">No documents found</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. New Office Block — Phase 2"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Site Address</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. 14 High Street, Manchester"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={dateCls} />
              </div>
              <div>
                <label className={labelCls}>Shift Type</label>
                <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className={inputCls}>
                  {SHIFT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Site Manager</label>
                <input
                  type="text"
                  value={siteManager}
                  onChange={(e) => setSiteManager(e.target.value)}
                  placeholder="e.g. John Smith"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Weather Condition</label>
                <select value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)} className={inputCls}>
                  <option value="">Select condition</option>
                  {WEATHER_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Additional Weather Remarks</label>
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

              <div className="flex items-center gap-4">
                <label className={`${labelCls} whitespace-nowrap`}>New Inductees Today</label>
                <input
                  type="number"
                  min={0}
                  value={newInductees}
                  onChange={(e) => setNewInductees(parseInt(e.target.value) || 0)}
                  className="w-24 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                />
              </div>

              {/* Workers */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Workers ({workers.length})</h3>
                  <button
                    onClick={() => setWorkers([...workers, { id: Date.now().toString(), trade: "", numberOfWorkers: 1, company: "" }])}
                    className={addBtn}
                  >
                    Add Worker
                  </button>
                </div>
                {workers.map((worker, index) => (
                  <div key={worker.id} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input type="text" placeholder="Trade / Type (e.g. Joiner, Labourer)" value={worker.trade}
                      onChange={(e) => { const n = [...workers]; n[index].trade = e.target.value; setWorkers(n); }} className={inlineCls} />
                    <input type="number" placeholder="Number of Workers" min={1} value={worker.numberOfWorkers}
                      onChange={(e) => { const n = [...workers]; n[index].numberOfWorkers = parseInt(e.target.value) || 1; setWorkers(n); }} className={inlineCls} />
                    <input type="text" placeholder="Company" value={worker.company}
                      onChange={(e) => { const n = [...workers]; n[index].company = e.target.value; setWorkers(n); }} className={inlineCls} />
                    <TrashBtn onClick={() => setWorkers(workers.filter((w) => w.id !== worker.id))} />
                  </div>
                ))}
              </div>

              {/* Subcontractors */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Subcontractors ({subcontractors.length})</h3>
                  <button
                    onClick={() => setSubcontractors([...subcontractors, { id: Date.now().toString(), trade: "", numberOfWorkers: 1, company: "" }])}
                    className={addBtn}
                  >
                    Add Subcontractor
                  </button>
                </div>
                {subcontractors.map((sub, index) => (
                  <div key={sub.id} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input type="text" placeholder="Trade / Type (e.g. Joiner, Labourer)" value={sub.trade}
                      onChange={(e) => { const n = [...subcontractors]; n[index].trade = e.target.value; setSubcontractors(n); }} className={inlineCls} />
                    <input type="number" placeholder="Number of Workers" min={1} value={sub.numberOfWorkers}
                      onChange={(e) => { const n = [...subcontractors]; n[index].numberOfWorkers = parseInt(e.target.value) || 1; setSubcontractors(n); }} className={inlineCls} />
                    <input type="text" placeholder="Company" value={sub.company}
                      onChange={(e) => { const n = [...subcontractors]; n[index].company = e.target.value; setSubcontractors(n); }} className={inlineCls} />
                    <TrashBtn onClick={() => setSubcontractors(subcontractors.filter((s) => s.id !== sub.id))} />
                  </div>
                ))}
              </div>

              {/* Visitors */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Visitors ({visitors.length})</h3>
                  <button
                    onClick={() => setVisitors([...visitors, { id: Date.now().toString(), name: "", company: "", purpose: "" }])}
                    className={addBtn}
                  >
                    Add Visitor
                  </button>
                </div>
                {visitors.map((visitor, index) => (
                  <div key={visitor.id} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input type="text" placeholder="Name" value={visitor.name}
                      onChange={(e) => { const n = [...visitors]; n[index].name = e.target.value; setVisitors(n); }} className={inlineCls} />
                    <input type="text" placeholder="Company" value={visitor.company}
                      onChange={(e) => { const n = [...visitors]; n[index].company = e.target.value; setVisitors(n); }} className={inlineCls} />
                    <input type="text" placeholder="Purpose" value={visitor.purpose}
                      onChange={(e) => { const n = [...visitors]; n[index].purpose = e.target.value; setVisitors(n); }} className={inlineCls} />
                    <TrashBtn onClick={() => setVisitors(visitors.filter((v) => v.id !== visitor.id))} />
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
                    onClick={() => setActivities([...activities, { id: Date.now().toString(), description: "" }])}
                    className={addBtn}
                  >
                    Add Activity
                  </button>
                </div>
                {activities.map((activity, index) => (
                  <div key={activity.id} className="mb-3 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Description of work carried out"
                      value={activity.description}
                      onChange={(e) => { const n = [...activities]; n[index].description = e.target.value; setActivities(n); }}
                      className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <TrashBtn onClick={() => setActivities(activities.filter((a) => a.id !== activity.id))} />
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Milestones ({milestones.length})</h3>
                  <button
                    onClick={() => setMilestones([...milestones, { id: Date.now().toString(), text: "" }])}
                    className={addBtn}
                  >
                    Add Milestone
                  </button>
                </div>
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="mb-3 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Milestone description"
                      value={milestone.text}
                      onChange={(e) => { const n = [...milestones]; n[index].text = e.target.value; setMilestones(n); }}
                      className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <TrashBtn onClick={() => setMilestones(milestones.filter((m) => m.id !== milestone.id))} />
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
                      onClick={() => setPlantOnSite([...plantOnSite, { id: Date.now().toString(), item: "", supplier: "" }])}
                      className={addBtn}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
                {plantOnSite.map((item, index) => (
                  <div key={item.id} className="mb-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        placeholder="Item"
                        value={item.item}
                        onChange={(e) => { const n = [...plantOnSite]; n[index].item = e.target.value; setPlantOnSite(n); }}
                        className="min-w-[140px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                      />
                      <input
                        type="text"
                        placeholder="Supplier"
                        value={item.supplier || ""}
                        onChange={(e) => { const n = [...plantOnSite]; n[index].supplier = e.target.value; setPlantOnSite(n); }}
                        className="min-w-[120px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = [...plantOnSite];
                          n[index].issue = n[index].issue !== undefined ? undefined : "";
                          setPlantOnSite(n);
                        }}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          item.issue !== undefined
                            ? "bg-red-600/20 text-red-300 hover:bg-red-600/30"
                            : "border border-blue-900/30 text-[rgb(245,239,230/.6)] hover:border-red-600/40 hover:text-red-300"
                        }`}
                      >
                        {item.issue !== undefined ? "✕ Clear Issue" : "Report Issue"}
                      </button>
                      <TrashBtn onClick={() => setPlantOnSite(plantOnSite.filter((p) => p.id !== item.id))} />
                    </div>
                    {item.issue !== undefined && (
                      <input
                        type="text"
                        placeholder="Describe the issue…"
                        value={item.issue}
                        onChange={(e) => { const n = [...plantOnSite]; n[index].issue = e.target.value; setPlantOnSite(n); }}
                        className="w-full rounded-md border border-red-600/30 bg-[#241b15] px-3 py-2 text-sm text-[#F5EFE6] focus:border-red-500/50 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Off Hired */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Off Hired ({plantOffHired.length})</h3>
                  <button
                    onClick={() => setPlantOffHired([...plantOffHired, { id: Date.now().toString(), item: "", date: new Date().toISOString().split("T")[0], notes: "" }])}
                    className={addBtn}
                  >
                    Add Item
                  </button>
                </div>
                {plantOffHired.map((item, index) => (
                  <div key={item.id} className="mb-4 flex flex-wrap items-center gap-3">
                    <input type="text" placeholder="Item" value={item.item}
                      onChange={(e) => { const n = [...plantOffHired]; n[index].item = e.target.value; setPlantOffHired(n); }}
                      className="min-w-[140px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
                    <input type="date" value={item.date}
                      onChange={(e) => { const n = [...plantOffHired]; n[index].date = e.target.value; setPlantOffHired(n); }}
                      className={inlineDateCls} />
                    <input type="text" placeholder="Notes" value={item.notes || ""}
                      onChange={(e) => { const n = [...plantOffHired]; n[index].notes = e.target.value; setPlantOffHired(n); }}
                      className="min-w-[120px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
                    <TrashBtn onClick={() => setPlantOffHired(plantOffHired.filter((p) => p.id !== item.id))} />
                  </div>
                ))}
              </div>

              {/* Breakdowns */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Breakdowns ({plantBreakdowns.length})</h3>
                  <button
                    onClick={() => setPlantBreakdowns([...plantBreakdowns, { id: Date.now().toString(), item: "", issue: "", actionTaken: "" }])}
                    className={addBtn}
                  >
                    Add Breakdown
                  </button>
                </div>
                {plantBreakdowns.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input type="text" placeholder="Item" value={item.item}
                      onChange={(e) => { const n = [...plantBreakdowns]; n[index].item = e.target.value; setPlantBreakdowns(n); }} className={inlineCls} />
                    <input type="text" placeholder="Issue" value={item.issue}
                      onChange={(e) => { const n = [...plantBreakdowns]; n[index].issue = e.target.value; setPlantBreakdowns(n); }} className={inlineCls} />
                    <input type="text" placeholder="Action Taken" value={item.actionTaken || ""}
                      onChange={(e) => { const n = [...plantBreakdowns]; n[index].actionTaken = e.target.value; setPlantBreakdowns(n); }} className={inlineCls} />
                    <TrashBtn onClick={() => setPlantBreakdowns(plantBreakdowns.filter((p) => p.id !== item.id))} />
                  </div>
                ))}
              </div>

              {/* Deliveries */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Deliveries ({plantDeliveries.length})</h3>
                  <button
                    onClick={() => setPlantDeliveries([...plantDeliveries, { id: Date.now().toString(), item: "", date: new Date().toISOString().split("T")[0], notes: "", photoUrls: [] }])}
                    className={addBtn}
                  >
                    Add Delivery
                  </button>
                </div>

                {/* Shared hidden input for delivery photos */}
                <input
                  ref={deliveryPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && deliveryUploadIndexRef.current >= 0) handleDeliveryPhoto(f, deliveryUploadIndexRef.current);
                    e.target.value = "";
                  }}
                />

                {plantDeliveries.map((item, index) => (
                  <div key={item.id} className="mb-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <input type="text" placeholder="Item" value={item.item}
                        onChange={(e) => { const n = [...plantDeliveries]; n[index].item = e.target.value; setPlantDeliveries(n); }}
                        className="min-w-[140px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
                      <input type="date" value={item.date}
                        onChange={(e) => { const n = [...plantDeliveries]; n[index].date = e.target.value; setPlantDeliveries(n); }}
                        className={inlineDateCls} />
                      <input type="text" placeholder="Notes" value={item.notes || ""}
                        onChange={(e) => { const n = [...plantDeliveries]; n[index].notes = e.target.value; setPlantDeliveries(n); }}
                        className="min-w-[120px] flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
                      <button
                        type="button"
                        onClick={() => { deliveryUploadIndexRef.current = index; deliveryPhotoInputRef.current?.click(); }}
                        className="rounded-full bg-[#2563eb] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                      >
                        📷 Photo
                      </button>
                      <TrashBtn onClick={() => setPlantDeliveries(plantDeliveries.filter((p) => p.id !== item.id))} />
                    </div>
                    {(item.photoUrls?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 pl-1">
                        {item.photoUrls!.map((url, ui) => (
                          <div key={ui} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Delivery photo" className="h-16 w-16 rounded-md border border-blue-900/20 object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setPlantDeliveries((prev) =>
                                  prev.map((d, i) =>
                                    i === index ? { ...d, photoUrls: d.photoUrls?.filter((_, j) => j !== ui) } : d,
                                  )
                                )
                              }
                              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                    onClick={() => setIncidents([...incidents, { id: Date.now().toString(), type: "incident", description: "", injured: "", actionTaken: "" }])}
                    className={addBtn}
                  >
                    Add Incident
                  </button>
                </div>
                <div className="w-full overflow-hidden">
                  {incidents.map((item, index) => (
                    <div key={item.id} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_auto]">
                      <select
                        value={item.type}
                        onChange={(e) => { const n = [...incidents]; n[index].type = e.target.value as "incident" | "near-miss" | "accident"; setIncidents(n); }}
                        className={inlineCls}
                      >
                        {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="text" placeholder="Description" value={item.description}
                        onChange={(e) => { const n = [...incidents]; n[index].description = e.target.value; setIncidents(n); }} className={inlineCls} />
                      <input type="text" placeholder="Injured Party" value={item.injured || ""}
                        onChange={(e) => { const n = [...incidents]; n[index].injured = e.target.value; setIncidents(n); }} className={inlineCls} />
                      <input type="text" placeholder="Action Taken" value={item.actionTaken || ""}
                        onChange={(e) => { const n = [...incidents]; n[index].actionTaken = e.target.value; setIncidents(n); }} className={inlineCls} />
                      <TrashBtn onClick={() => setIncidents(incidents.filter((i) => i.id !== item.id))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Toolbox Talks */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Toolbox Talks ({toolboxTalks.length})</h3>
                  <button
                    onClick={() => setToolboxTalks([...toolboxTalks, { id: crypto.randomUUID(), topic: "", showRemarks: false }])}
                    className={addBtn}
                  >
                    Add Talk
                  </button>
                </div>
                {toolboxTalks.map((item, index) => (
                  <div key={item.id} className="mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Topic"
                        value={item.topic}
                        onChange={(e) => { const n = [...toolboxTalks]; n[index].topic = e.target.value; setToolboxTalks(n); }}
                        className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { const n = [...toolboxTalks]; n[index].showRemarks = !n[index].showRemarks; setToolboxTalks(n); }}
                        className="whitespace-nowrap text-xs text-[rgb(245,239,230/.5)] hover:text-[#2563eb]"
                      >
                        {item.showRemarks ? "Hide Remarks" : "Add Remarks"}
                      </button>
                      <TrashBtn onClick={() => setToolboxTalks(toolboxTalks.filter((t) => t.id !== item.id))} />
                    </div>
                    {item.showRemarks && (
                      <textarea
                        value={item.remarks || ""}
                        onChange={(e) => { const n = [...toolboxTalks]; n[index].remarks = e.target.value; setToolboxTalks(n); }}
                        placeholder="Optional remarks…"
                        rows={2}
                        className="mt-2 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-sm text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

            </div>
          </section>

          {/* ── Photos ─────────────────────────────────────── */}
          <section>
            <h2 className={sectionHeading}>Photos</h2>
            <div className="space-y-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ""; }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ""; }}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-blue-900/30 px-4 py-2 text-sm font-medium text-[#F5EFE6] transition hover:border-blue-700/50 hover:bg-[#241b15]"
                >
                  Choose File
                </button>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative rounded-lg border border-blue-900/20 bg-[#241b15] p-2">
                      {photo.uploading ? (
                        <div className="flex h-24 items-center justify-center rounded bg-[#1a1410]">
                          <span className="text-xs text-[rgb(245,239,230/.5)]">Uploading…</span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt={photo.caption || "Photo"} className="h-24 w-full rounded object-cover" />
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Caption"
                          value={photo.caption || ""}
                          onChange={(e) => setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, caption: e.target.value } : p))}
                          className="flex-1 rounded border border-blue-900/20 bg-[#1a1410] px-2 py-1 text-xs text-[#F5EFE6] focus:outline-none"
                        />
                        <TrashBtn onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          {/* ── Sign-off ─────────────────────────────────────  */}
          <section>
            <h2 className={sectionHeading}>Sign-off</h2>
            <label className={labelCls}>Site Manager Signature</label>
            <div className="mt-3">
              <canvas
                ref={canvasRef}
                width={800}
                height={160}
                className="w-full cursor-crosshair touch-none rounded-md border border-blue-900/20 bg-white"
                onMouseDown={startSigDraw}
                onMouseMove={drawSig}
                onMouseUp={stopSigDraw}
                onMouseLeave={stopSigDraw}
                onTouchStart={startSigDraw}
                onTouchMove={drawSig}
                onTouchEnd={stopSigDraw}
              />
              <div className="mt-2 flex items-center gap-4">
                <p className="text-xs text-[rgb(245,239,230/.4)]">Draw your signature above</p>
                {signatureDataUrl && (
                  <button
                    type="button"
                    onClick={clearSig}
                    className="text-xs text-[rgb(245,239,230/.4)] transition hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ── Toast notification ───────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-xl border border-blue-900/30 bg-[#241b15] px-4 py-3 text-sm text-[#F5EFE6] shadow-lg">
          {toast}
        </div>
      )}

      {/* ── Floating action buttons ───────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <button
          onClick={() => {
            const subject = encodeURIComponent('Bug Report — FredConSol Site Diary');
            const body = encodeURIComponent(`Please describe the bug:\n\nURL: ${window.location.href}\n\n`);
            window.open(`mailto:contactfredconsol@gmail.com?subject=${subject}&body=${body}`);
          }}
          className="rounded-xl border border-blue-900/30 bg-[#241b15] px-3 py-2 text-xs font-semibold text-[#F5EFE6]/70 shadow-lg transition-colors hover:bg-blue-900/20 hover:text-[#F5EFE6]"
        >
          🐛 Report a Bug
        </button>
        <button
          onClick={saveDraft}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      {/* ── Import from Previous Diary Modal ──────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/20 bg-[#241b15] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#F5EFE6]">Import Plant from Previous Diary</h3>
              <button onClick={() => setShowImportModal(false)} className="text-[rgb(245,239,230/.6)] hover:text-[#F5EFE6]">✕</button>
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
                    <span className="ml-3 text-sm text-[rgb(245,239,230/.6)]">{d.plantOnSite.length} item{d.plantOnSite.length !== 1 ? "s" : ""}</span>
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
