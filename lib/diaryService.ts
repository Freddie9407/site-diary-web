import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import app from "./firebaseClient";
import type { SiteDiary } from "./types";

const db = getFirestore(app);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      const val = sanitizeForFirestore(obj[key]);
      if (val !== undefined) clean[key] = val;
    }
    return clean;
  }
  return obj;
}

export async function createDiary(orgId: string, userId: string, data: Partial<SiteDiary>) {
  const diaryData = sanitizeForFirestore({
    ...data,
    orgId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const diaryRef = await addDoc(collection(db, "orgs", orgId, "siteDiaries"), diaryData);
  return diaryRef.id;
}

export async function saveDiary(orgId: string, diaryId: string, data: Partial<SiteDiary>) {
  const diaryRef = doc(db, "orgs", orgId, "siteDiaries", diaryId);
  await setDoc(diaryRef, sanitizeForFirestore({ ...data, updatedAt: serverTimestamp() }), { merge: true });
}

export async function loadDiary(orgId: string, diaryId: string) {
  const diaryRef = doc(db, "orgs", orgId, "siteDiaries", diaryId);
  const diarySnap = await getDoc(diaryRef);

  if (!diarySnap.exists()) {
    return null;
  }

  return { id: diarySnap.id, ...(diarySnap.data() as SiteDiary) };
}

export async function listDiaries(orgId: string) {
  const diariesQuery = query(
    collection(db, "orgs", orgId, "siteDiaries"),
    orderBy("date", "desc"),
  );
  const snapshot = await getDocs(diariesQuery);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as SiteDiary),
  }));
}

export async function deleteDiary(orgId: string, diaryId: string) {
  const diaryRef = doc(db, "orgs", orgId, "siteDiaries", diaryId);
  await deleteDoc(diaryRef);
}
