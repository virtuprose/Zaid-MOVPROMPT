import type { CreationDraft } from "./contracts";

const DATABASE_NAME = "movprompt-guest-creator";
const DATABASE_VERSION = 1;
const DRAFTS = "drafts";
const ASSETS = "assets";

type StoredAsset = {
  key: string;
  draftId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Guest draft storage is unavailable."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFTS)) database.createObjectStore(DRAFTS, { keyPath: "id" });
      if (!database.objectStoreNames.contains(ASSETS)) {
        const assets = database.createObjectStore(ASSETS, { keyPath: "key" });
        assets.createIndex("draftId", "draftId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transact<T>(storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = work(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Guest draft operation failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Guest draft transaction failed."));
  }));
}

export async function saveGuestDraft(draft: CreationDraft) {
  await transact(DRAFTS, "readwrite", (store) => store.put(draft));
  return draft;
}

export async function getGuestDraft(id: string) {
  const draft = await transact<CreationDraft | undefined>(DRAFTS, "readonly", (store) => store.get(id));
  if (!draft) return null;
  if (new Date(draft.expiresAt).getTime() <= Date.now()) {
    await deleteGuestDraft(id);
    return null;
  }
  return draft;
}

export async function putGuestAsset(draftId: string, file: File) {
  const key = `${draftId}/${crypto.randomUUID()}`;
  const asset: StoredAsset = { key, draftId, name: file.name, mimeType: file.type, size: file.size, blob: file, createdAt: new Date().toISOString() };
  await transact(ASSETS, "readwrite", (store) => store.put(asset));
  return key;
}

export async function getGuestAsset(key: string) {
  return (await transact<StoredAsset | undefined>(ASSETS, "readonly", (store) => store.get(key))) ?? null;
}

export async function deleteGuestDraft(id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([DRAFTS, ASSETS], "readwrite");
    transaction.objectStore(DRAFTS).delete(id);
    const index = transaction.objectStore(ASSETS).index("draftId");
    const cursor = index.openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (current) {
        current.delete();
        current.continue();
      }
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function cleanupExpiredGuestDrafts() {
  const database = await openDatabase();
  const expired: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DRAFTS, "readonly");
    const cursor = transaction.objectStore(DRAFTS).openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) return;
      const draft = current.value as CreationDraft;
      if (new Date(draft.expiresAt).getTime() <= Date.now()) expired.push(draft.id);
      current.continue();
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
  await Promise.all(expired.map(deleteGuestDraft));
}
