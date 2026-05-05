// FXSEDGE — Secure Storage for API Keys
// AES-GCM encryption with a key stored in IndexedDB (harder to exfiltrate than localStorage)
// Backward compatible: reads legacy btoa format and re-encrypts on next save

const DB_NAME = 'fxs_secure'
const STORE = 'keys'
const ENC_KEY_ID = 'master'

// Open or create IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbGet(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbSet(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Get or generate a non-extractable AES-GCM key
async function getMasterKey() {
  let key = await dbGet(ENC_KEY_ID).catch(() => null)
  if (!key) {
    // Generate new key — non-extractable so it can't be read out, even by malicious code
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    )
    await dbSet(ENC_KEY_ID, key)
  }
  return key
}

// Encrypt a string → base64 ciphertext
export async function encrypt(plaintext) {
  try {
    const key = await getMasterKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new TextEncoder().encode(plaintext)
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
    // Concat iv + cipher, base64
    const combined = new Uint8Array(iv.length + cipher.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(cipher), iv.length)
    return btoa(String.fromCharCode(...combined))
  } catch (e) {
    // Fallback to btoa (better than nothing)
    return 'btoa:' + btoa(plaintext)
  }
}

// Decrypt base64 ciphertext → string
export async function decrypt(ciphertext) {
  if (!ciphertext) return null
  // Backward compat: detect legacy btoa-only format
  if (ciphertext.startsWith('btoa:')) {
    return atob(ciphertext.slice(5))
  }
  // Backward compat: pure base64 (legacy bitunix/bitget format)
  // Try AES-GCM first, fallback to plain atob
  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    if (combined.length < 13) throw new Error('too short')
    const iv = combined.slice(0, 12)
    const cipher = combined.slice(12)
    const key = await getMasterKey()
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    return new TextDecoder().decode(plain)
  } catch {
    // Legacy fallback — pure btoa
    try { return atob(ciphertext) } catch { return null }
  }
}

// Check if running in a context that supports Web Crypto + IndexedDB
export function isSecureStorageAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle && typeof indexedDB !== 'undefined'
}
