const DB_NAME = 'sonora-jdr';
const DB_VERSION = 1;
let opened;

function openDB() {
  if (opened) return opened;
  opened = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sounds')) db.createObjectStore('sounds', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opened;
}
async function transaction(store, mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const output = action(tx.objectStore(store));
    let result;
    output.onsuccess = () => { result = output.result; };
    output.onerror = () => reject(output.error);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
  });
}
export const getConfig = async () => (await transaction('settings', 'readonly', st => st.get('config')))?.value;
export const putConfig = value => transaction('settings', 'readwrite', st => st.put({key:'config', value}));
export const getSound = id => transaction('sounds', 'readonly', st => st.get(id));
export const getAllSounds = () => transaction('sounds','readonly', st => st.getAll());
export const putSound = value => transaction('sounds', 'readwrite', st => st.put(value));
export const deleteSound = id => transaction('sounds', 'readwrite', st => st.delete(id));
export async function replaceAll(config, sounds) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(['settings','sounds'], 'readwrite');
    const store = tx.objectStore('sounds');
    store.clear();
    for (const sound of sounds) store.put(sound);
    tx.objectStore('settings').put({key:'config',value:config});
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error || new Error('Import interrompu'));
  });
}
