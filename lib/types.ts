export type DiaryStatus = 'draft' | 'completed';

export interface WeatherInfo {
  condition: string;
  notApplicable: boolean;
  additionalRemarks?: string;
}

export interface LabourEntry {
  id: string;
  trade: string;
  numberOfWorkers: number;
  company: string;
}

export interface SubcontractorEntry {
  id: string;
  trade: string;
  numberOfWorkers: number;
  company: string;
}

export interface VisitorEntry {
  id: string;
  name: string;
  company: string;
  purpose: string;
}

export interface WorkActivity {
  id: string;
  description: string;
}

export interface PlantItem {
  id: string;
  item: string;
  supplier?: string;
  checkStatus: 'not-checked' | 'serviceable' | 'issue';
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

export interface IncidentEntry {
  id: string;
  type: 'incident' | 'near-miss' | 'accident';
  description: string;
  injured?: string;
  actionTaken?: string;
}

export interface PhotoEntry {
  id: string;
  url: string;
  caption?: string;
  section?: string;
  uploadedAt: string;
}

export interface ToolboxTalk {
  id: string;
  topic: string;
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
  shiftType: string;
  weather: WeatherInfo;
  siteManager: string;
  linkedRamsId?: string;
  linkedRamsTitle?: string;
  linkedRamsRef?: string;

  // Section 2 — Labour
  workers: LabourEntry[];
  subcontractors: SubcontractorEntry[];
  visitors: VisitorEntry[];

  // Section 3 — Work Activities
  activities: WorkActivity[];
  milestones: string[];

  // Section 4 — Plant & Materials
  plantOnSite: PlantItem[];
  plantOffHired: PlantOffHire[];
  plantBreakdowns: PlantBreakdown[];
  plantDeliveries: PlantDelivery[];

  // Section 5 — Health & Safety
  incidents: IncidentEntry[];
  toolboxTalks: ToolboxTalk[];

  // Section 6 — Photos
  photos: PhotoEntry[];

  // Section 7 — Notes & Sign-off
  notes: string;
  signoff: {
    completedBy: string;
    title: string;
    date: string;
    signatureUrl?: string;
  };
}
