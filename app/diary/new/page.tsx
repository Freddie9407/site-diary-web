"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "@/lib/firebaseClient";
import { getOrgId } from "@/lib/auth";
import { createDiary, saveDiary } from "@/lib/diaryService";
import type { SiteDiary } from "@/lib/types";

const SIGN_IN_URL = "https://fredconsol.co.uk/signin.html";

const WEATHER_CONDITIONS = [
  "Sunny",
  "Cloudy",
  "Overcast",
  "Rain",
  "Heavy Rain",
  "Snow",
  "Frost",
  "Wind",
];

const INCIDENT_TYPES = ["incident", "near-miss", "accident"];
const INSPECTION_RESULTS = ["approved", "rejected", "conditional"];

export default function NewDiaryPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [diaryId, setDiaryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic Info
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [workingHoursStart, setWorkingHoursStart] = useState("");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("");
  const [siteManager, setSiteManager] = useState("");

  // Weather
  const [weatherCondition, setWeatherCondition] = useState("");
  const [temperature, setTemperature] = useState("");
  const [wind, setWind] = useState("");
  const [rainfall, setRainfall] = useState("");

  // Labour & Personnel
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; trade: string; company: string; vehicleReg?: string }>>([]);
  const [visitors, setVisitors] = useState<Array<{ id: string; name: string; company: string; purpose: string; timeIn?: string; timeOut?: string }>>([]);

  // Work Activities
  const [activities, setActivities] = useState<Array<{ id: string; area: string; description: string; progress?: string }>>([]);
  const [milestones, setMilestones] = useState<string[]>([]);

  // Plant & Equipment
  const [plantOnSite, setPlantOnSite] = useState<Array<{ id: string; item: string; supplier?: string; checkStatus: 'ok' | 'issue' | 'not-checked'; notes?: string }>>([]);
  const [plantOffHired, setPlantOffHired] = useState<Array<{ id: string; item: string; date: string; notes?: string }>>([]);
  const [plantBreakdowns, setPlantBreakdowns] = useState<Array<{ id: string; item: string; issue: string; actionTaken?: string }>>([]);
  const [plantDeliveries, setPlantDeliveries] = useState<Array<{ id: string; item: string; date: string; notes?: string; photoUrls?: string[] }>>([]);

  // Materials & Deliveries
  const [materialDeliveries, setMaterialDeliveries] = useState<Array<{ id: string; material: string; quantity: string; supplier?: string; notes?: string; photoUrls?: string[] }>>([]);
  const [materialShortages, setMaterialShortages] = useState<string[]>([]);
  const [waste, setWaste] = useState<Array<{ id: string; type: string; contractor?: string; notes?: string }>>([]);

  // Issues, Delays & Variations
  const [delays, setDelays] = useState<Array<{ id: string; cause: string; duration?: string; impact?: string }>>([]);
  const [variations, setVariations] = useState<Array<{ id: string; description: string; instructedBy?: string; verbal: boolean; notes?: string }>>([]);
  const [designQueries, setDesignQueries] = useState<string[]>([]);

  // Health & Safety
  const [incidents, setIncidents] = useState<Array<{ id: string; type: 'incident' | 'near-miss' | 'accident'; description: string; injured?: string; actionTaken?: string }>>([]);
  const [inspections, setInspections] = useState<Array<{ id: string; work: string; inspectedBy: string; result: 'approved' | 'rejected' | 'conditional'; notes?: string }>>([]);
  const [tests, setTests] = useState<Array<{ id: string; type: string; result: string; by?: string; notes?: string }>>([]);
  const [toolboxTalks, setToolboxTalks] = useState<Array<{ topic: string; attendees: number }>>([]);

  // Photos
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; caption?: string; section?: string; uploadedAt: string }>>([]);

  // Additional Notes
  const [notes, setNotes] = useState("");

  // Sign-off
  const [signoffCompletedBy, setSignoffCompletedBy] = useState("");
  const [signoffTitle, setSignoffTitle] = useState("");
  const [signoffDate, setSignoffDate] = useState(new Date().toISOString().split("T")[0]);
  const [signoffSignatureUrl, setSignoffSignatureUrl] = useState<string | undefined>();

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

    // Calculate day of week
    const d = new Date(date);
    setDayOfWeek(d.toLocaleDateString('en-US', { weekday: 'long' }));

    return () => unsubscribe();
  }, [date]);

  const addWorker = () => {
    setWorkers([...workers, { id: Date.now().toString(), name: "", trade: "", company: "", vehicleReg: "" }]);
  };

  const removeWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  const addVisitor = () => {
    setVisitors([...visitors, { id: Date.now().toString(), name: "", company: "", purpose: "", timeIn: "", timeOut: "" }]);
  };

  const removeVisitor = (id: string) => {
    setVisitors(visitors.filter(v => v.id !== id));
  };

  const addActivity = () => {
    setActivities([...activities, { id: Date.now().toString(), area: "", description: "", progress: "" }]);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const addPlantOnSite = () => {
    setPlantOnSite([...plantOnSite, { id: Date.now().toString(), item: "", supplier: "", checkStatus: "not-checked", notes: "" }]);
  };

  const removePlantOnSite = (id: string) => {
    setPlantOnSite(plantOnSite.filter(p => p.id !== id));
  };

  const addPlantOffHire = () => {
    setPlantOffHired([...plantOffHired, { id: Date.now().toString(), item: "", date: new Date().toISOString().split("T")[0], notes: "" }]);
  };

  const removePlantOffHire = (id: string) => {
    setPlantOffHired(plantOffHired.filter(p => p.id !== id));
  };

  const addPlantBreakdown = () => {
    setPlantBreakdowns([...plantBreakdowns, { id: Date.now().toString(), item: "", issue: "", actionTaken: "" }]);
  };

  const removePlantBreakdown = (id: string) => {
    setPlantBreakdowns(plantBreakdowns.filter(p => p.id !== id));
  };

  const addPlantDelivery = () => {
    setPlantDeliveries([...plantDeliveries, { id: Date.now().toString(), item: "", date: new Date().toISOString().split("T")[0], notes: "", photoUrls: [] }]);
  };

  const removePlantDelivery = (id: string) => {
    setPlantDeliveries(plantDeliveries.filter(p => p.id !== id));
  };

  const addMaterialDelivery = () => {
    setMaterialDeliveries([...materialDeliveries, { id: Date.now().toString(), material: "", quantity: "", supplier: "", notes: "", photoUrls: [] }]);
  };

  const removeMaterialDelivery = (id: string) => {
    setMaterialDeliveries(materialDeliveries.filter(m => m.id !== id));
  };

  const addWaste = () => {
    setWaste([...waste, { id: Date.now().toString(), type: "", contractor: "", notes: "" }]);
  };

  const removeWaste = (id: string) => {
    setWaste(waste.filter(w => w.id !== id));
  };

  const addDelay = () => {
    setDelays([...delays, { id: Date.now().toString(), cause: "", duration: "", impact: "" }]);
  };

  const removeDelay = (id: string) => {
    setDelays(delays.filter(d => d.id !== id));
  };

  const addVariation = () => {
    setVariations([...variations, { id: Date.now().toString(), description: "", instructedBy: "", verbal: false, notes: "" }]);
  };

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const addIncident = () => {
    setIncidents([...incidents, { id: Date.now().toString(), type: "incident", description: "", injured: "", actionTaken: "" }]);
  };

  const removeIncident = (id: string) => {
    setIncidents(incidents.filter(i => i.id !== id));
  };

  const addInspection = () => {
    setInspections([...inspections, { id: Date.now().toString(), work: "", inspectedBy: "", result: "approved", notes: "" }]);
  };

  const removeInspection = (id: string) => {
    setInspections(inspections.filter(i => i.id !== id));
  };

  const addTest = () => {
    setTests([...tests, { id: Date.now().toString(), type: "", result: "", by: "", notes: "" }]);
  };

  const removeTest = (id: string) => {
    setTests(tests.filter(t => t.id !== id));
  };

  const addToolboxTalk = () => {
    setToolboxTalks([...toolboxTalks, { topic: "", attendees: 0 }]);
  };

  const removeToolboxTalk = (id: string) => {
    setToolboxTalks(toolboxTalks.filter(t => t.id !== id));
  };

  const saveDraft = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    try {
      const data: Partial<SiteDiary> = {
        status: "draft",
        projectName,
        siteAddress,
        date,
        dayOfWeek,
        weather: { condition: weatherCondition, temperature, wind, rainfall },
        workingHours: { start: workingHoursStart, end: workingHoursEnd },
        siteManager,
        workers,
        visitors,
        activities,
        milestones,
        plantOnSite,
        plantOffHired,
        plantBreakdowns,
        plantDeliveries,
        materialDeliveries,
        materialShortages,
        waste,
        delays,
        variations,
        designQueries,
        incidents,
        inspections,
        tests,
        toolboxTalks,
        photos,
        notes,
        signoff: {
          completedBy: signoffCompletedBy,
          title: signoffTitle,
          date: signoffDate,
          signatureUrl: signoffSignatureUrl,
        },
      };

      if (diaryId) {
        await saveDiary(orgId, diaryId, data);
      } else {
        const newId = await createDiary(orgId, userId, data);
        setDiaryId(newId);
      }
      alert("Draft saved!");
    } catch (error) {
      alert("Error saving draft");
    } finally {
      setSaving(false);
    }
  };

  const completeAndExport = async () => {
    if (!orgId || !userId) return;
    setSaving(true);
    try {
      const data: Partial<SiteDiary> = {
        status: "completed",
        projectName,
        siteAddress,
        date,
        dayOfWeek,
        weather: { condition: weatherCondition, temperature, wind, rainfall },
        workingHours: { start: workingHoursStart, end: workingHoursEnd },
        siteManager,
        workers,
        visitors,
        activities,
        milestones,
        plantOnSite,
        plantOffHired,
        plantBreakdowns,
        plantDeliveries,
        materialDeliveries,
        materialShortages,
        waste,
        delays,
        variations,
        designQueries,
        incidents,
        inspections,
        tests,
        toolboxTalks,
        photos,
        notes,
        signoff: {
          completedBy: signoffCompletedBy,
          title: signoffTitle,
          date: signoffDate,
          signatureUrl: signoffSignatureUrl,
        },
      };

      if (diaryId) {
        await saveDiary(orgId, diaryId, data);
      } else {
        const newId = await createDiary(orgId, userId, data);
        setDiaryId(newId);
      }
      // TODO: Export PDF
      alert("Diary completed! PDF export coming soon.");
      router.push("/dashboard");
    } catch (error) {
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
          <a href="/dashboard" className="text-[#F5EFE6] hover:text-[#ea580c]">← Back</a>
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
              className="rounded-full bg-[#ea580c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#dc2626] disabled:opacity-50"
            >
              Complete & Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Basic Info */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Site Address</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Day of Week</label>
                <input
                  type="text"
                  value={dayOfWeek}
                  readOnly
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Working Hours Start</label>
                <input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Working Hours End</label>
                <input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Site Manager</label>
                <input
                  type="text"
                  value={siteManager}
                  onChange={(e) => setSiteManager(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Weather */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Weather</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Condition</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                >
                  <option value="">Select condition</option>
                  {WEATHER_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Temperature (°C)</label>
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Wind Speed</label>
                <input
                  type="text"
                  value={wind}
                  onChange={(e) => setWind(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Rainfall Notes</label>
                <input
                  type="text"
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Labour & Personnel */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Labour & Personnel</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Workers ({workers.length})</h3>
                  <button
                    onClick={addWorker}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Worker
                  </button>
                </div>
                {workers.map((worker, index) => (
                  <div key={worker.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={worker.name}
                      onChange={(e) => {
                        const newWorkers = [...workers];
                        newWorkers[index].name = e.target.value;
                        setWorkers(newWorkers);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Trade"
                      value={worker.trade}
                      onChange={(e) => {
                        const newWorkers = [...workers];
                        newWorkers[index].trade = e.target.value;
                        setWorkers(newWorkers);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={worker.company}
                      onChange={(e) => {
                        const newWorkers = [...workers];
                        newWorkers[index].company = e.target.value;
                        setWorkers(newWorkers);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Vehicle Reg"
                        value={worker.vehicleReg || ""}
                        onChange={(e) => {
                          const newWorkers = [...workers];
                          newWorkers[index].vehicleReg = e.target.value;
                          setWorkers(newWorkers);
                        }}
                        className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                      />
                      <button
                        onClick={() => removeWorker(worker.id)}
                        className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Visitors ({visitors.length})</h3>
                  <button
                    onClick={addVisitor}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Visitor
                  </button>
                </div>
                {visitors.map((visitor, index) => (
                  <div key={visitor.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Name"
                      value={visitor.name}
                      onChange={(e) => {
                        const newVisitors = [...visitors];
                        newVisitors[index].name = e.target.value;
                        setVisitors(newVisitors);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={visitor.company}
                      onChange={(e) => {
                        const newVisitors = [...visitors];
                        newVisitors[index].company = e.target.value;
                        setVisitors(newVisitors);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Purpose"
                      value={visitor.purpose}
                      onChange={(e) => {
                        const newVisitors = [...visitors];
                        newVisitors[index].purpose = e.target.value;
                        setVisitors(newVisitors);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="time"
                      placeholder="Time In"
                      value={visitor.timeIn || ""}
                      onChange={(e) => {
                        const newVisitors = [...visitors];
                        newVisitors[index].timeIn = e.target.value;
                        setVisitors(newVisitors);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="time"
                        placeholder="Time Out"
                        value={visitor.timeOut || ""}
                        onChange={(e) => {
                          const newVisitors = [...visitors];
                          newVisitors[index].timeOut = e.target.value;
                          setVisitors(newVisitors);
                        }}
                        className="flex-1 rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                      />
                      <button
                        onClick={() => removeVisitor(visitor.id)}
                        className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Work Activities */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Work Activities</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Activities ({activities.length})</h3>
                  <button
                    onClick={addActivity}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Activity
                  </button>
                </div>
                {activities.map((activity, index) => (
                  <div key={activity.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Area"
                      value={activity.area}
                      onChange={(e) => {
                        const newActivities = [...activities];
                        newActivities[index].area = e.target.value;
                        setActivities(newActivities);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={activity.description}
                      onChange={(e) => {
                        const newActivities = [...activities];
                        newActivities[index].description = e.target.value;
                        setActivities(newActivities);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Progress"
                      value={activity.progress || ""}
                      onChange={(e) => {
                        const newActivities = [...activities];
                        newActivities[index].progress = e.target.value;
                        setActivities(newActivities);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeActivity(activity.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-[#F5EFE6]">Milestones</h3>
                <textarea
                  value={milestones.join("\n")}
                  onChange={(e) => setMilestones(e.target.value.split("\n").filter(m => m.trim()))}
                  placeholder="Enter milestones, one per line"
                  rows={4}
                  className="w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Plant & Equipment */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Plant & Equipment</h2>
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">On Site ({plantOnSite.length})</h3>
                  <button
                    onClick={addPlantOnSite}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Item
                  </button>
                </div>
                {plantOnSite.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Item"
                      value={item.item}
                      onChange={(e) => {
                        const newItems = [...plantOnSite];
                        newItems[index].item = e.target.value;
                        setPlantOnSite(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Supplier"
                      value={item.supplier || ""}
                      onChange={(e) => {
                        const newItems = [...plantOnSite];
                        newItems[index].supplier = e.target.value;
                        setPlantOnSite(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <select
                      value={item.checkStatus}
                      onChange={(e) => {
                        const newItems = [...plantOnSite];
                        newItems[index].checkStatus = e.target.value as 'ok' | 'issue' | 'not-checked';
                        setPlantOnSite(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    >
                      <option value="not-checked">Not Checked</option>
                      <option value="ok">OK</option>
                      <option value="issue">Issue</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...plantOnSite];
                        newItems[index].notes = e.target.value;
                        setPlantOnSite(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removePlantOnSite(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Off Hired ({plantOffHired.length})</h3>
                  <button
                    onClick={addPlantOffHire}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
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
                        const newItems = [...plantOffHired];
                        newItems[index].item = e.target.value;
                        setPlantOffHired(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => {
                        const newItems = [...plantOffHired];
                        newItems[index].date = e.target.value;
                        setPlantOffHired(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...plantOffHired];
                        newItems[index].notes = e.target.value;
                        setPlantOffHired(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removePlantOffHire(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Breakdowns ({plantBreakdowns.length})</h3>
                  <button
                    onClick={addPlantBreakdown}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
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
                        const newItems = [...plantBreakdowns];
                        newItems[index].item = e.target.value;
                        setPlantBreakdowns(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Issue"
                      value={item.issue}
                      onChange={(e) => {
                        const newItems = [...plantBreakdowns];
                        newItems[index].issue = e.target.value;
                        setPlantBreakdowns(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Action Taken"
                      value={item.actionTaken || ""}
                      onChange={(e) => {
                        const newItems = [...plantBreakdowns];
                        newItems[index].actionTaken = e.target.value;
                        setPlantBreakdowns(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removePlantBreakdown(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Deliveries ({plantDeliveries.length})</h3>
                  <button
                    onClick={addPlantDelivery}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
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
                        const newItems = [...plantDeliveries];
                        newItems[index].item = e.target.value;
                        setPlantDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => {
                        const newItems = [...plantDeliveries];
                        newItems[index].date = e.target.value;
                        setPlantDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...plantDeliveries];
                        newItems[index].notes = e.target.value;
                        setPlantDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button className="flex-1 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]">
                        Upload Photo
                      </button>
                      <button
                        onClick={() => removePlantDelivery(item.id)}
                        className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Materials & Deliveries */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Materials & Deliveries</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Deliveries ({materialDeliveries.length})</h3>
                  <button
                    onClick={addMaterialDelivery}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Delivery
                  </button>
                </div>
                {materialDeliveries.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Material"
                      value={item.material}
                      onChange={(e) => {
                        const newItems = [...materialDeliveries];
                        newItems[index].material = e.target.value;
                        setMaterialDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...materialDeliveries];
                        newItems[index].quantity = e.target.value;
                        setMaterialDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Supplier"
                      value={item.supplier || ""}
                      onChange={(e) => {
                        const newItems = [...materialDeliveries];
                        newItems[index].supplier = e.target.value;
                        setMaterialDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...materialDeliveries];
                        newItems[index].notes = e.target.value;
                        setMaterialDeliveries(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button className="flex-1 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]">
                        Upload Photo
                      </button>
                      <button
                        onClick={() => removeMaterialDelivery(item.id)}
                        className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-[#F5EFE6]">Shortages</h3>
                <textarea
                  value={materialShortages.join("\n")}
                  onChange={(e) => setMaterialShortages(e.target.value.split("\n").filter(s => s.trim()))}
                  placeholder="Enter material shortages, one per line"
                  rows={4}
                  className="w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Waste ({waste.length})</h3>
                  <button
                    onClick={addWaste}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Waste
                  </button>
                </div>
                {waste.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Type"
                      value={item.type}
                      onChange={(e) => {
                        const newItems = [...waste];
                        newItems[index].type = e.target.value;
                        setWaste(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Contractor"
                      value={item.contractor || ""}
                      onChange={(e) => {
                        const newItems = [...waste];
                        newItems[index].contractor = e.target.value;
                        setWaste(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...waste];
                        newItems[index].notes = e.target.value;
                        setWaste(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeWaste(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Issues, Delays & Variations */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Issues, Delays & Variations</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Delays ({delays.length})</h3>
                  <button
                    onClick={addDelay}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Delay
                  </button>
                </div>
                {delays.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Cause"
                      value={item.cause}
                      onChange={(e) => {
                        const newItems = [...delays];
                        newItems[index].cause = e.target.value;
                        setDelays(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Duration"
                      value={item.duration || ""}
                      onChange={(e) => {
                        const newItems = [...delays];
                        newItems[index].duration = e.target.value;
                        setDelays(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Impact"
                      value={item.impact || ""}
                      onChange={(e) => {
                        const newItems = [...delays];
                        newItems[index].impact = e.target.value;
                        setDelays(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeDelay(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Variations ({variations.length})</h3>
                  <button
                    onClick={addVariation}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Variation
                  </button>
                </div>
                {variations.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...variations];
                        newItems[index].description = e.target.value;
                        setVariations(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Instructed By"
                      value={item.instructedBy || ""}
                      onChange={(e) => {
                        const newItems = [...variations];
                        newItems[index].instructedBy = e.target.value;
                        setVariations(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <label className="flex items-center gap-2 text-[#F5EFE6]">
                      <input
                        type="checkbox"
                        checked={item.verbal}
                        onChange={(e) => {
                          const newItems = [...variations];
                          newItems[index].verbal = e.target.checked;
                          setVariations(newItems);
                        }}
                        className="rounded border border-blue-900/20 bg-[#241b15] focus:border-blue-700/40"
                      />
                      Verbal
                    </label>
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...variations];
                        newItems[index].notes = e.target.value;
                        setVariations(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeVariation(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-[#F5EFE6]">Design Queries</h3>
                <textarea
                  value={designQueries.join("\n")}
                  onChange={(e) => setDesignQueries(e.target.value.split("\n").filter(q => q.trim()))}
                  placeholder="Enter design queries, one per line"
                  rows={4}
                  className="w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Health & Safety */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Health & Safety</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Incidents ({incidents.length})</h3>
                  <button
                    onClick={addIncident}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Incident
                  </button>
                </div>
                {incidents.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const newItems = [...incidents];
                        newItems[index].type = e.target.value as 'incident' | 'near-miss' | 'accident';
                        setIncidents(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    >
                      {INCIDENT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...incidents];
                        newItems[index].description = e.target.value;
                        setIncidents(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Injured Party"
                      value={item.injured || ""}
                      onChange={(e) => {
                        const newItems = [...incidents];
                        newItems[index].injured = e.target.value;
                        setIncidents(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Action Taken"
                      value={item.actionTaken || ""}
                      onChange={(e) => {
                        const newItems = [...incidents];
                        newItems[index].actionTaken = e.target.value;
                        setIncidents(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeIncident(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Inspections ({inspections.length})</h3>
                  <button
                    onClick={addInspection}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Inspection
                  </button>
                </div>
                {inspections.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Work Inspected"
                      value={item.work}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].work = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Inspected By"
                      value={item.inspectedBy}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].inspectedBy = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <select
                      value={item.result}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].result = e.target.value as 'approved' | 'rejected' | 'conditional';
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    >
                      {INSPECTION_RESULTS.map((result) => (
                        <option key={result} value={result}>{result}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].notes = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeInspection(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Toolbox Talks ({toolboxTalks.length})</h3>
                  <button
                    onClick={addToolboxTalk}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Talk
                  </button>
                </div>
                {toolboxTalks.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      placeholder="Topic"
                      value={item.topic}
                      onChange={(e) => {
                        const newItems = [...toolboxTalks];
                        newItems[index].topic = e.target.value;
                        setToolboxTalks(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Attendees"
                      value={item.attendees}
                      onChange={(e) => {
                        const newItems = [...toolboxTalks];
                        newItems[index].attendees = parseInt(e.target.value) || 0;
                        setToolboxTalks(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeToolboxTalk(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Inspections & Tests */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Inspections & Tests</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Inspections ({inspections.length})</h3>
                  <button
                    onClick={addInspection}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Inspection
                  </button>
                </div>
                {inspections.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Work Inspected"
                      value={item.work}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].work = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Inspected By"
                      value={item.inspectedBy}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].inspectedBy = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <select
                      value={item.result}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].result = e.target.value as 'approved' | 'rejected' | 'conditional';
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    >
                      {INSPECTION_RESULTS.map((result) => (
                        <option key={result} value={result}>{result}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...inspections];
                        newItems[index].notes = e.target.value;
                        setInspections(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeInspection(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#F5EFE6]">Tests ({tests.length})</h3>
                  <button
                    onClick={addTest}
                    className="rounded-full bg-[#2563eb] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                  >
                    Add Test
                  </button>
                </div>
                {tests.map((item, index) => (
                  <div key={item.id} className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      type="text"
                      placeholder="Type"
                      value={item.type}
                      onChange={(e) => {
                        const newItems = [...tests];
                        newItems[index].type = e.target.value;
                        setTests(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Result"
                      value={item.result}
                      onChange={(e) => {
                        const newItems = [...tests];
                        newItems[index].result = e.target.value;
                        setTests(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="By"
                      value={item.by || ""}
                      onChange={(e) => {
                        const newItems = [...tests];
                        newItems[index].by = e.target.value;
                        setTests(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={item.notes || ""}
                      onChange={(e) => {
                        const newItems = [...tests];
                        newItems[index].notes = e.target.value;
                        setTests(newItems);
                      }}
                      className="rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removeTest(item.id)}
                      className="rounded-md bg-red-600 px-3 py-2 text-white transition hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Photos */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Photos</h2>
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

          {/* Additional Notes */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Additional Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={6}
              className="w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
            />
          </section>

          {/* Sign-off */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold text-[#F5EFE6] border-b-2 border-[#ea580c] pb-2">Sign-off</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Completed By</label>
                <input
                  type="text"
                  value={signoffCompletedBy}
                  onChange={(e) => setSignoffCompletedBy(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Job Title</label>
                <input
                  type="text"
                  value={signoffTitle}
                  onChange={(e) => setSignoffTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(245,239,230/.6)]">Date</label>
                <input
                  type="date"
                  value={signoffDate}
                  onChange={(e) => setSignoffDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-blue-900/20 bg-[#241b15] px-3 py-2 text-[#F5EFE6] focus:border-blue-700/40 focus:outline-none"
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
    </div>
  );
}