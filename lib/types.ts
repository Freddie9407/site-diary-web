export type DiaryStatus = 'draft' | 'completed';

export interface WeatherInfo {
  condition: string;
  temperature?: string;
  wind?: string;
  rainfall?: string;
}

export interface LabourEntry {
  id: string;
  name: string;
  trade: string;
  company: string;
  vehicleReg?: string;
}

export interface VisitorEntry {
  id: string;
  name: string;
  company: string;
  purpose: string;
  timeIn?: string;
  timeOut?: string;
}

export interface WorkActivity {
  id: string;
  area: string;
  description: string;
  progress?: string;
}

export interface PlantItem {
  id: string;
  item: string;
  supplier?: string;
  checkStatus: 'ok' | 'issue' | 'not-checked';
  notes?: string;
}

export interface PlantDelivery {
  id: string;
  item: string;
  date: string;
  notes?: string;
  photoUrls?: string[];
}

export interface PlantOffHire {
  id: string;
  item: string;
  date: string;
  notes?: string;
}

export interface PlantBreakdown {
  id: string;
  item: string;
  issue: string;
  actionTaken?: string;
}

export interface MaterialDelivery {
  id: string;
  material: string;
  quantity: string;
  supplier?: string;
  notes?: string;
  photoUrls?: string[];
}

export interface WasteEntry {
  id: string;
  type: string;
  contractor?: string;
  notes?: string;
}

export interface DelayEntry {
  id: string;
  cause: string;
  duration?: string;
  impact?: string;
}

export interface VariationEntry {
  id: string;
  description: string;
  instructedBy?: string;
  verbal: boolean;
  notes?: string;
}

export interface IncidentEntry {
  id: string;
  type: 'incident' | 'near-miss' | 'accident';
  description: string;
  injured?: string;
  actionTaken?: string;
}

export interface InspectionEntry {
  id: string;
  work: string;
  inspectedBy: string;
  result: 'approved' | 'rejected' | 'conditional';
  notes?: string;
}

export interface TestEntry {
  id: string;
  type: string;
  result: string;
  by?: string;
  notes?: string;
}

export interface PhotoEntry {
  id: string;
  url: string;
  caption?: string;
  section?: string;
  uploadedAt: string;
}

export interface SiteDiary {
  id?: string;
  orgId: string;
  userId: string;
  status: DiaryStatus;
  createdAt?: string;
  updatedAt?: string;

  // Section 1 — Basic Info
  projectName: string;
  siteAddress: string;
  date: string;
  dayOfWeek: string;
  weather: WeatherInfo;
  workingHours: { start: string; end: string };
  siteManager: string;

  // Section 2 — Labour
  workers: LabourEntry[];
  visitors: VisitorEntry[];

  // Section 3 — Work Activities
  activities: WorkActivity[];
  milestones: string[];

  // Section 4 — Plant
  plantOnSite: PlantItem[];
  plantOffHired: PlantOffHire[];
  plantBreakdowns: PlantBreakdown[];
  plantDeliveries: PlantDelivery[];

  // Section 5 — Materials
  materialDeliveries: MaterialDelivery[];
  materialShortages: string[];
  waste: WasteEntry[];

  // Section 6 — Issues
  delays: DelayEntry[];
  variations: VariationEntry[];
  designQueries: string[];

  // Section 7 — Health & Safety
  incidents: IncidentEntry[];
  inspections: InspectionEntry[];
  tests: TestEntry[];
  toolboxTalks: { topic: string; attendees: number }[];

  // Section 8 — Photos
  photos: PhotoEntry[];

  // Section 9 — Notes & Sign-off
  notes: string;
  signoff: {
    completedBy: string;
    title: string;
    date: string;
    signatureUrl?: string;
  };
}