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

export async function createDiary(orgId: string, userId: string, data: Partial<SiteDiary>) {
  const diaryData = {
    ...data,
    orgId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const diaryRef = await addDoc(collection(db, "orgs", orgId, "siteDiaries"), diaryData);
  return diaryRef.id;
}

export async function saveDiary(orgId: string, diaryId: string, data: Partial<SiteDiary>) {
  const diaryRef = doc(db, "orgs", orgId, "siteDiaries", diaryId);
  await setDoc(diaryRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
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
