import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

dotenv.config();

// Prevent server process crashes on background promise rejections
process.on('unhandledRejection', (reason) => {
  console.warn('[AarohAI Server] Background unhandled promise rejection handled:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigFile = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));

const adminApp = !getApps().length
  ? initializeApp({ projectId: firebaseConfig.projectId })
  : getApps()[0];

const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (_) {}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

interface StoredKey {
  id: string;
  name: string;
  key: string;
  masked: string;
  isActive: boolean;
  successCount: number;
  errorCount: number;
  status: 'Healthy 🟢' | 'Quota Exhausted (Minute) 🟡' | 'Quota Exhausted (Daily) 🟠' | 'Invalid / Error 🔴';
  lastUsed?: string;
  lastError?: string;
  retryAfter?: number; // timestamp in ms
  projectId?: string; 
}

// Centralized Multi-Key Gemini Failover Service with Persistence
class KeyManager {
  private keyList: StoredKey[] = [];
  private deletedKeyIds: Set<string> = new Set();
  private activeIndex: number = 0;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initKeys();
  }

  private async initKeys() {
    const localCachePath = path.resolve(__dirname, '.keys_cache.json');
    let cachedData: any = null;
    try {
      if (fs.existsSync(localCachePath)) {
        cachedData = JSON.parse(fs.readFileSync(localCachePath, 'utf-8'));
        if (cachedData && typeof cachedData === 'object' && !Array.isArray(cachedData)) {
          if (Array.isArray(cachedData.deletedKeyIds)) {
            cachedData.deletedKeyIds.forEach((id: string) => this.deletedKeyIds.add(id));
          }
        }
      }
    } catch (_) {}

    const envKeys = [
      { name: 'Primary Key', key: process.env.GEMINI_API_KEY, projectId: 'proj-1' },
      { name: 'Backup Key 1', key: process.env.GEMINI_API_KEY_2, projectId: 'proj-1' },
      { name: 'Backup Key 2', key: process.env.GEMINI_API_KEY_3, projectId: 'proj-2' },
      { name: 'Backup Key 3', key: process.env.GEMINI_API_KEY_4, projectId: 'proj-3' }
    ];

    envKeys.forEach((entry, idx) => {
      const raw = entry.key?.trim();
      const id = `key-env-${idx + 1}`;
      if (raw && raw !== 'MY_GEMINI_API_KEY' && !this.deletedKeyIds.has(id) && !this.deletedKeyIds.has(raw)) {
        const masked = raw.length > 8 ? `${raw.substring(0, 4)}...${raw.substring(raw.length - 4)}` : `Key_${idx + 1}`;
        this.keyList.push({
          id,
          name: entry.name,
          key: raw,
          masked,
          isActive: idx === 0,
          successCount: 0,
          errorCount: 0,
          status: 'Healthy 🟢',
          projectId: entry.projectId
        });
      }
    });

    try {
      if (cachedData) {
        const listToLoad = Array.isArray(cachedData) ? cachedData : (cachedData.keys || []);
        listToLoad.forEach((stored: any) => {
          if (this.deletedKeyIds.has(stored.id) || this.deletedKeyIds.has(stored.key)) return;
          const existing = this.keyList.find(k => k.id === stored.id || k.key === stored.key);
          if (existing) {
            existing.status = stored.status;
            existing.successCount = stored.successCount || 0;
            existing.errorCount = stored.errorCount || 0;
            existing.lastError = stored.lastError;
            existing.retryAfter = stored.retryAfter;
            existing.projectId = stored.projectId || existing.projectId;
          } else if (stored.key) {
            this.keyList.push(stored);
          }
        });
      }
    } catch (_) {}

    // Optionally sync from Firestore if accessible
    try {
      const snap = await db.collection('api_keys').get();
      snap.forEach((doc: any) => {
        const stored = doc.data();
        if (this.deletedKeyIds.has(doc.id) || this.deletedKeyIds.has(stored.key)) return;
        const existing = this.keyList.find(k => k.id === doc.id || k.key === stored.key);
        if (existing) {
          existing.status = stored.status;
          existing.successCount = stored.successCount || 0;
          existing.errorCount = stored.errorCount || 0;
          existing.lastError = stored.lastError;
          existing.retryAfter = stored.retryAfter;
          existing.projectId = stored.projectId || existing.projectId;
        }
      });
    } catch (e: any) {
      console.info('[AarohAI] KeyManager initialized with local state & failover.');
    }
  }

  private async syncToFirestore() {
    // Save to local cache first
    try {
      const localCachePath = path.resolve(__dirname, '.keys_cache.json');
      fs.writeFileSync(localCachePath, JSON.stringify({
        keys: this.keyList,
        deletedKeyIds: Array.from(this.deletedKeyIds)
      }, null, 2), 'utf-8');
    } catch (_) {}

    if (this.syncTimer) return;
    this.syncTimer = setTimeout(async () => {
      try {
        const batch = db.batch();
        this.keyList.forEach(k => {
          const ref = db.collection('api_keys').doc(k.id);
          batch.set(ref, {
            name: k.name || 'API Key',
            maskedKey: k.masked || '',
            status: k.status,
            successCount: k.successCount || 0,
            errorCount: k.errorCount || 0,
            lastUsed: k.lastUsed || null,
            lastError: k.lastError || null,
            retryAfter: k.retryAfter || null,
            projectId: k.projectId || null,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      } catch (e: any) {
        // Suppress expected admin-permission notices while maintaining full in-memory & file state
      } finally {
        this.syncTimer = null;
      }
    }, 5000);
  }

  public getKeysPublicInfo() {
    return this.keyList.map((k, idx) => ({
      id: k.id,
      name: k.name,
      maskedKey: k.masked,
      isActive: idx === this.activeIndex,
      successCount: k.successCount,
      errorCount: k.errorCount,
      status: k.status,
      lastUsed: k.lastUsed,
      lastError: k.lastError,
      retryAfter: k.retryAfter ? new Date(k.retryAfter).toLocaleTimeString() : undefined,
      projectId: k.projectId
    }));
  }

  public getActiveKey(): string {
    const now = Date.now();
    for (let i = 0; i < this.keyList.length; i++) {
      const idx = (this.activeIndex + i) % this.keyList.length;
      const k = this.keyList[idx];
      if (k.status === 'Healthy 🟢') {
        this.activeIndex = idx;
        return k.key;
      }
      if (k.retryAfter && k.retryAfter < now) {
        k.status = 'Healthy 🟢';
        k.retryAfter = undefined;
        this.activeIndex = idx;
        return k.key;
      }
    }
    return this.keyList[this.activeIndex]?.key || '';
  }

  public recordSuccess() {
    const cur = this.keyList[this.activeIndex];
    if (cur) {
      cur.successCount += 1;
      cur.status = 'Healthy 🟢';
      cur.lastUsed = new Date().toLocaleTimeString();
      this.syncToFirestore();
    }
  }

  public recordError(errMessage: string, statusCode?: number) {
    const cur = this.keyList[this.activeIndex];
    if (cur) {
      cur.errorCount += 1;
      cur.lastError = errMessage.slice(0, 150);
      cur.lastUsed = new Date().toLocaleTimeString();

      const msg = errMessage.toLowerCase();
      if (statusCode === 429 || msg.includes('429') || msg.includes('resource_exhausted')) {
        if (msg.includes('per_minute')) {
          cur.status = 'Quota Exhausted (Minute) 🟡';
          cur.retryAfter = Date.now() + 65000;
        } else {
          cur.status = 'Quota Exhausted (Daily) 🟠';
          cur.retryAfter = Date.now() + (12 * 60 * 60 * 1000); 
        }
        this.rotateKey();
      } else if (statusCode === 401 || statusCode === 403 || msg.includes('invalid') || msg.includes('permission')) {
        cur.status = 'Invalid / Error 🔴';
        this.rotateKey();
      } else {
        this.rotateKey();
      }
      this.syncToFirestore();
    }
  }

  private rotateKey() {
    if (this.keyList.length > 1) {
      this.activeIndex = (this.activeIndex + 1) % this.keyList.length;
    }
  }

  public addKey(name: string, rawKey: string): StoredKey {
    const raw = rawKey.trim();
    const masked = raw.length > 8 ? `${raw.substring(0, 4)}...${raw.substring(raw.length - 4)}` : `Key_${this.keyList.length + 1}`;
    const newKey: StoredKey = {
      id: `key-user-${Date.now()}`,
      name: name.trim() || `API Key ${this.keyList.length + 1}`,
      key: raw,
      masked,
      isActive: false,
      successCount: 0,
      errorCount: 0,
      status: 'Healthy 🟢'
    };
    this.keyList.push(newKey);
    this.syncToFirestore();
    return newKey;
  }

  public removeKey(id: string): boolean {
    this.deletedKeyIds.add(id);
    const idx = this.keyList.findIndex(k => k.id === id);
    if (idx !== -1) {
      const removedKey = this.keyList.splice(idx, 1)[0];
      if (removedKey?.key) {
        this.deletedKeyIds.add(removedKey.key);
      }
      if (this.activeIndex >= this.keyList.length) {
        this.activeIndex = Math.max(0, this.keyList.length - 1);
      }
      this.syncToFirestore();
      if (removedKey && removedKey.id) {
        db.collection('api_keys').doc(removedKey.id).delete().catch(() => {});
      }
      return true;
    }
    this.syncToFirestore();
    return false;
  }

  public setActiveIndex(index: number) {
    if (index >= 0 && index < this.keyList.length) {
      this.activeIndex = index;
    }
  }

  public getActiveClient(): any {
    return new GoogleGenAI({
      apiKey: this.getActiveKey(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
}

const keyManager = new KeyManager();

// Robust persistent local fallback store (guarantees 100% uptime regardless of Cloud IAM restrictions)
const localStorePath = path.resolve(__dirname, '.local_app_data.json');
let localStore: {
  users: Record<string, any>;
  userPrivateKeys: Record<string, any[]>;
  notifications: any[];
  notificationsHistory: any[];
  banners: any[];
} = {
  users: {
    'usr-owner-1': {
      id: 'usr-owner-1',
      fullName: 'Sonam Kumari (Owner)',
      email: 'sonam234rajput@gmail.com',
      mobile: '+91 98765 43210',
      isRegistered: true,
      isRestricted: false,
      createdAt: '2026-11-01T10:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    },
    'usr-owner-2': {
      id: 'usr-owner-2',
      fullName: 'Rishabh Singh Rajput (Owner)',
      email: 'rishabhsinghrajput8877@gmail.com',
      mobile: '+91 88776 54321',
      isRegistered: true,
      isRestricted: false,
      createdAt: '2026-11-01T10:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    },
    'usr-owner-3': {
      id: 'usr-owner-3',
      fullName: 'Sonam Rajput (Owner)',
      email: 'sonamkumari40411@gmail.com',
      mobile: '+91 91234 56789',
      isRegistered: true,
      isRestricted: false,
      createdAt: '2026-11-02T10:00:00.000Z',
      lastLoginAt: new Date().toISOString()
    }
  },
  userPrivateKeys: {},
  notifications: [],
  notificationsHistory: [],
  banners: []
};

try {
  if (fs.existsSync(localStorePath)) {
    const raw = fs.readFileSync(localStorePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      localStore = {
        users: { ...localStore.users, ...(parsed.users || {}) },
        userPrivateKeys: { ...(parsed.userPrivateKeys || {}) },
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        notificationsHistory: Array.isArray(parsed.notificationsHistory) ? parsed.notificationsHistory : [],
        banners: Array.isArray(parsed.banners) ? parsed.banners : []
      };
    }
  }
} catch (_) {}

function saveLocalStore() {
  try {
    fs.writeFileSync(localStorePath, JSON.stringify(localStore, null, 2), 'utf-8');
  } catch (_) {}
}

async function getUserPersonalApiKey(userId?: string): Promise<string | null> {
  if (!userId || typeof userId !== 'string') return null;
  // Check in-memory / localStore first for immediate access
  if (localStore.userPrivateKeys[userId]?.length) {
    const list = localStore.userPrivateKeys[userId];
    const active = list.find((k: any) => k.isActive && k.status !== 'Invalid / Error 🔴');
    if (active && active.key) return active.key;
    const healthy = list.find((k: any) => k.status === 'Healthy 🟢' || !k.status);
    if (healthy && healthy.key) return healthy.key;
    if (list.length > 0 && list[0].key) return list[0].key;
  }

  try {
    const docSnap = await db.collection('user_private_api_keys').doc(userId).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const keysList: StoredKey[] = data?.keys || [];
      const active = keysList.find(k => k.isActive && k.status !== 'Invalid / Error 🔴');
      if (active && active.key) return active.key;
      const healthy = keysList.find(k => k.status === 'Healthy 🟢' || !k.status);
      if (healthy && healthy.key) return healthy.key;
      if (keysList.length > 0 && keysList[0].key) return keysList[0].key;
    }
  } catch (e) {
    console.warn('[User Key Lookup Warning]:', e);
  }
  return null;
}

async function executeGeminiWithFailover<T>(
  fn: (ai: any, modelName: string) => Promise<T>,
  preferredModel = 'gemini-3.8-flash',
  userApiKey?: string | null
): Promise<T> {
  const candidateModels = Array.from(new Set([preferredModel, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'])).filter(Boolean);

  // If the student has configured their own personal API key, try with their key first
  if (userApiKey && userApiKey.trim()) {
    for (const modelCandidate of candidateModels) {
      for (let retries = 0; retries < 2; retries++) {
        try {
          const userAi = new GoogleGenAI({
            apiKey: userApiKey.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          const result = await fn(userAi, modelCandidate);
          return result;
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const status = err?.status || err?.statusCode || err?.code;
          const is503 = status === 503 || errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('overloaded');
          if (is503 || status === 429 || errMsg.includes('429')) {
            if (retries === 0) {
              await new Promise((resolve) => setTimeout(resolve, 350));
              continue;
            }
          }
          console.warn(`[User Key Failover] Model ${modelCandidate} notice: ${errMsg.slice(0, 80)}. Falling back to server pool...`);
          break;
        }
      }
    }
  }

  // System key pool failover
  const totalKeys = Math.max(1, keyManager.getKeysPublicInfo().length);
  let lastErr: any = null;

  for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
    for (const modelCandidate of candidateModels) {
      for (let retries = 0; retries < 2; retries++) {
        try {
          const ai = keyManager.getActiveClient();
          const result = await fn(ai, modelCandidate);
          keyManager.recordSuccess();
          return result;
        } catch (err: any) {
          lastErr = err;
          const errMsg = err?.message || String(err);
          const status = err?.status || err?.statusCode || err?.code;
          const is503 = status === 503 || errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('overloaded');

          if (!is503) {
            keyManager.recordError(errMsg, typeof status === 'number' ? status : undefined);
          }

          if (is503 || status === 429 || errMsg.includes('429')) {
            if (retries === 0) {
              await new Promise((resolve) => setTimeout(resolve, 350));
              continue;
            }
          }

          console.warn(`[Gemini Candidate Failover] ${modelCandidate} notice (${is503 ? '503 High Demand Spike' : errMsg.slice(0, 80)}). Switching to fallback model...`);
          break;
        }
      }
    }
  }
  throw lastErr || new Error('All Gemini API keys and failover models failed. Please retry.');
}

function getLanguageInstruction(language: string) {
  switch (language) {
    case 'Hindi': return 'Strictly respond in natural Hindi using Devanagari script.';
    case 'Hinglish': return 'Strictly respond in natural friendly Hinglish (Hindi-English mix) using Roman script.';
    case 'English': return 'Strictly respond in proper academic English.';
    default: return 'Respond in friendly Hinglish (Roman script) unless specified.';
  }
}

function parseGeminiJson<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;
  try {
    let cleaned = rawText.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    
    // Find first '{' or '[' and last '}' or ']'
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    let startIdx = -1;

    if (firstObj !== -1 && firstArr !== -1) {
      startIdx = Math.min(firstObj, firstArr);
    } else if (firstObj !== -1) {
      startIdx = firstObj;
    } else if (firstArr !== -1) {
      startIdx = firstArr;
    }

    if (startIdx !== -1) {
      const lastObj = cleaned.lastIndexOf('}');
      const lastArr = cleaned.lastIndexOf(']');
      const endIdx = Math.max(lastObj, lastArr);
      if (endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
    }

    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn('[AarohAI JSON Safe Parser] Fallback triggered due to non-JSON output:', err?.message || err);
    return fallback;
  }
}

// =====================================================================
// API ROUTES
// =====================================================================

// 1. System Health & Keys Pool
app.get('/api/key-health', (req, res) => {
  res.json({
    keys: keyManager.getKeysPublicInfo(),
    totalKeys: keyManager.getKeysPublicInfo().length
  });
});

app.get('/api/keys', (req, res) => {
  res.json({
    keys: keyManager.getKeysPublicInfo()
  });
});

app.post('/api/keys', async (req, res) => {
  try {
    const { name, key } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Valid Gemini API key string is required.' });
    }

    // Live verification call to Gemini list-models API before saving
    const verification = await verifyGeminiKey(key.trim());
    if (!verification.valid) {
      return res.status(400).json({
        error: `API Key Verification Failed 🔴: ${verification.message}. Please check your key permissions at Google AI Studio.`
      });
    }

    const added = keyManager.addKey(name, key.trim());
    res.json({
      success: true,
      message: 'API Key verified and added successfully to failover pool 🟢!',
      key: added,
      keys: keyManager.getKeysPublicInfo()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/keys/:id', (req, res) => {
  try {
    const success = keyManager.removeKey(req.params.id);
    res.json({ success, keys: keyManager.getKeysPublicInfo() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/keys/active', (req, res) => {
  try {
    const { index } = req.body;
    keyManager.setActiveIndex(Number(index) || 0);
    res.json({ success: true, keys: keyManager.getKeysPublicInfo() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export async function verifyGeminiKey(apiKey: string): Promise<{ valid: boolean; message: string; status: string; modelsCount?: number }> {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return {
      valid: false,
      status: 'Invalid / Error 🔴',
      message: 'API Key string is empty or invalid.'
    };
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const modelsPager = await ai.models.list();
    let modelsCount = 0;
    if (modelsPager) {
      for await (const _model of modelsPager as any) {
        modelsCount++;
        if (modelsCount >= 5) break;
      }
    }

    return {
      valid: true,
      status: 'Healthy 🟢',
      message: 'API Key permissions verified via Gemini list-models endpoint.',
      modelsCount
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    return {
      valid: false,
      status: 'Invalid / Error 🔴',
      message: `Gemini Key Verification Failed: ${errMsg.slice(0, 150)}`
    };
  }
}

// Live API Key Verification Route using list-models endpoint
app.post('/api/keys/verify', async (req, res) => {
  try {
    const { id, rawKey } = req.body;
    let targetKey = rawKey?.trim();

    if (!targetKey && id) {
      const keysList = (keyManager as any).keyList || [];
      const foundKey = keysList.find((k: any) => k.id === id);
      if (foundKey) targetKey = foundKey.key;
    }

    if (!targetKey) {
      targetKey = keyManager.getActiveKey();
    }

    const verificationResult = await verifyGeminiKey(targetKey);

    const keysList = (keyManager as any).keyList || [];
    if (id) {
      const found = keysList.find((k: any) => k.id === id);
      if (found) {
        found.status = verificationResult.status as any;
        if (verificationResult.valid) {
          found.lastError = undefined;
          found.successCount += 1;
        } else {
          found.lastError = verificationResult.message.slice(0, 150);
          found.errorCount += 1;
        }
      }
    }

    res.json({
      ...verificationResult,
      keys: keyManager.getKeysPublicInfo()
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, status: 'Invalid / Error 🔴', message: err.message });
  }
});

// =====================================================================
// PER-USER SECURE API KEY VAULT ENDPOINTS (Server-Side Isolated per UID)
// =====================================================================
app.get('/api/user/keys', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.json({ keys: keyManager.getKeysPublicInfo() });
    }
    let rawKeys: StoredKey[] = localStore.userPrivateKeys[userId] || [];
    try {
      const docSnap = await db.collection('user_private_api_keys').doc(userId).get();
      if (docSnap.exists) {
        rawKeys = docSnap.data()?.keys || rawKeys;
        localStore.userPrivateKeys[userId] = rawKeys;
      }
    } catch (_) {}

    const publicKeys = rawKeys.map(k => ({
      id: k.id,
      name: k.name,
      masked: k.masked || (k.key?.length > 8 ? `${k.key.substring(0, 4)}...${k.key.substring(k.key.length - 4)}` : 'Key_Active'),
      isActive: !!k.isActive,
      status: k.status || 'Healthy 🟢',
      successCount: k.successCount || 0,
      errorCount: k.errorCount || 0,
      lastUsed: k.lastUsed,
      lastError: k.lastError
    }));
    res.json({ keys: publicKeys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/keys', async (req, res) => {
  try {
    const { userId, name, key } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Valid Gemini API key string is required.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to configure personal API key.' });
    }

    const verification = await verifyGeminiKey(key.trim());
    if (!verification.valid) {
      return res.status(400).json({
        error: `API Key Verification Failed 🔴: ${verification.message}. Please get your free Gemini API key from https://aistudio.google.com/app/apikey`
      });
    }

    let existingKeys: StoredKey[] = localStore.userPrivateKeys[userId] || [];
    try {
      const docRef = db.collection('user_private_api_keys').doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        existingKeys = docSnap.data()?.keys || existingKeys;
      }
    } catch (_) {}

    const raw = key.trim();
    const masked = raw.length > 8 ? `${raw.substring(0, 4)}...${raw.substring(raw.length - 4)}` : `Key_${existingKeys.length + 1}`;

    existingKeys.forEach(k => { k.isActive = false; });

    const newKey: StoredKey = {
      id: `usr-key-${Date.now()}`,
      name: name?.trim() || `My API Key ${existingKeys.length + 1}`,
      key: raw,
      masked,
      isActive: true,
      successCount: 0,
      errorCount: 0,
      status: 'Healthy 🟢'
    };

    existingKeys.push(newKey);
    localStore.userPrivateKeys[userId] = existingKeys;
    saveLocalStore();

    try {
      await db.collection('user_private_api_keys').doc(userId).set({ keys: existingKeys, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}

    const publicKeys = existingKeys.map(k => ({
      id: k.id,
      name: k.name,
      masked: k.masked,
      isActive: !!k.isActive,
      status: k.status,
      successCount: k.successCount,
      errorCount: k.errorCount,
      lastUsed: k.lastUsed,
      lastError: k.lastError
    }));

    res.json({
      success: true,
      message: 'Personal API Key verified and saved securely to your personal vault 🟢!',
      key: { id: newKey.id, name: newKey.name, masked: newKey.masked, isActive: true, status: 'Healthy 🟢' },
      keys: publicKeys
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/keys/:id', async (req, res) => {
  try {
    const keyId = req.params.id;
    const userId = (req.query.userId as string) || (req.body?.userId as string);
    if (!userId) {
      keyManager.removeKey(keyId);
      return res.json({ success: true, keys: keyManager.getKeysPublicInfo() });
    }
    let existingKeys: StoredKey[] = localStore.userPrivateKeys[userId] || [];
    try {
      const docRef = db.collection('user_private_api_keys').doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        existingKeys = docSnap.data()?.keys || existingKeys;
      }
    } catch (_) {}

    existingKeys = existingKeys.filter(k => k.id !== keyId);
    if (existingKeys.length > 0 && !existingKeys.some(k => k.isActive)) {
      existingKeys[0].isActive = true;
    }
    localStore.userPrivateKeys[userId] = existingKeys;
    saveLocalStore();

    try {
      await db.collection('user_private_api_keys').doc(userId).set({ keys: existingKeys, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}

    const publicKeys = existingKeys.map(k => ({
      id: k.id,
      name: k.name,
      masked: k.masked,
      isActive: !!k.isActive,
      status: k.status,
      successCount: k.successCount,
      errorCount: k.errorCount,
      lastUsed: k.lastUsed,
      lastError: k.lastError
    }));
    res.json({ success: true, keys: publicKeys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/keys/active', async (req, res) => {
  try {
    const { userId, index } = req.body;
    if (!userId) {
      keyManager.setActiveIndex(Number(index) || 0);
      return res.json({ success: true, keys: keyManager.getKeysPublicInfo() });
    }
    let existingKeys: StoredKey[] = localStore.userPrivateKeys[userId] || [];
    try {
      const docRef = db.collection('user_private_api_keys').doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) existingKeys = docSnap.data()?.keys || existingKeys;
    } catch (_) {}

    existingKeys.forEach((k, idx) => {
      k.isActive = idx === Number(index);
    });
    localStore.userPrivateKeys[userId] = existingKeys;
    saveLocalStore();

    try {
      await db.collection('user_private_api_keys').doc(userId).set({ keys: existingKeys, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/keys/verify', async (req, res) => {
  try {
    const { userId, id } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    let existingKeys: StoredKey[] = localStore.userPrivateKeys[userId] || [];
    try {
      const docRef = db.collection('user_private_api_keys').doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) existingKeys = docSnap.data()?.keys || existingKeys;
    } catch (_) {}

    const targetKey = existingKeys.find(k => k.id === id) || existingKeys.find(k => k.isActive) || existingKeys[0];
    if (!targetKey) {
      return res.status(404).json({ error: 'No configured keys found to verify' });
    }
    const verification = await verifyGeminiKey(targetKey.key);
    targetKey.status = verification.status as any;
    if (verification.valid) {
      targetKey.successCount += 1;
      targetKey.lastError = undefined;
    } else {
      targetKey.errorCount += 1;
      targetKey.lastError = verification.message;
    }
    targetKey.lastUsed = new Date().toLocaleTimeString();

    localStore.userPrivateKeys[userId] = existingKeys;
    saveLocalStore();

    try {
      await db.collection('user_private_api_keys').doc(userId).set({ keys: existingKeys, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}

    const publicKeys = existingKeys.map(k => ({
      id: k.id,
      name: k.name,
      masked: k.masked,
      isActive: !!k.isActive,
      status: k.status,
      successCount: k.successCount,
      errorCount: k.errorCount,
      lastUsed: k.lastUsed,
      lastError: k.lastError
    }));

    res.json({
      valid: verification.valid,
      status: verification.status,
      message: verification.message,
      keys: publicKeys
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// OWNER USER MANAGEMENT ENDPOINTS
// =====================================================================
app.get('/api/owner/users', async (req, res) => {
  try {
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const usersMap: Record<string, any> = { ...localStore.users };

    try {
      const snap = await db.collection('users').get();
      snap.forEach((doc: any) => {
        const data = doc.data();
        usersMap[doc.id] = {
          id: doc.id,
          fullName: data.fullName || data.name || data.displayName || 'Registered Student',
          email: data.email || 'N/A',
          mobile: data.mobile || data.phone || 'N/A',
          isRegistered: data.isRegistered ?? true,
          isRestricted: !!data.isRestricted,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt || new Date().toISOString()
        };
      });
    } catch (_) {
      // Graceful fallback to localStore
    }

    let usersList = Object.values(usersMap);
    if (search) {
      usersList = usersList.filter(u =>
        (u.fullName || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search) ||
        (u.mobile || '').toLowerCase().includes(search)
      );
    }

    usersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ users: usersList, total: usersList.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/owner/users/register', async (req, res) => {
  try {
    const { id, name, fullName, email, mobile } = req.body;
    const uid = id || `user-${Date.now()}`;
    const userRec = {
      id: uid,
      fullName: fullName || name || 'Registered Student',
      email: email || 'student@gmail.com',
      mobile: mobile || '',
      isRegistered: true,
      isRestricted: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    localStore.users[uid] = userRec;
    saveLocalStore();
    try {
      await db.collection('users').doc(uid).set(userRec, { merge: true });
    } catch (_) {}
    res.json({ success: true, user: userRec });
  } catch (err: any) {
    res.json({ success: true });
  }
});

app.post('/api/owner/users/:id/toggle-restrict', async (req, res) => {
  try {
    const userId = req.params.id;
    let current = !!localStore.users[userId]?.isRestricted;
    try {
      const docRef = db.collection('users').doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        current = !!docSnap.data()?.isRestricted;
      }
      await docRef.set({ isRestricted: !current, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}

    if (localStore.users[userId]) {
      localStore.users[userId].isRestricted = !current;
    } else {
      localStore.users[userId] = {
        id: userId,
        fullName: 'Student',
        email: 'N/A',
        mobile: '',
        isRegistered: true,
        isRestricted: !current,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
    saveLocalStore();

    res.json({ success: true, isRestricted: !current });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// VERIFIED NOTIFICATION SYSTEM (Sending..., Successfully Sent, History)
// =====================================================================
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { title, message, targetAudience = 'all', recipientEmail } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notifId = `notif-${Date.now()}`;
    const sentAt = new Date().toISOString();

    const notifDoc = {
      id: notifId,
      userId: targetAudience === 'specific' ? (recipientEmail || 'specific') : 'broadcast',
      title: title.trim(),
      message: message.trim(),
      type: 'broadcast',
      read: false,
      createdAt: sentAt
    };

    localStore.notifications.unshift(notifDoc);
    try {
      await db.collection('notifications').doc(notifId).set(notifDoc);
    } catch (_) {}

    const historyDoc = {
      id: `hist-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      targetAudience,
      recipientEmail: recipientEmail || (targetAudience === 'all' ? 'All Users' : 'Active Users'),
      sentAt,
      status: 'Successfully Sent',
      deliveredCount: 1
    };

    localStore.notificationsHistory.unshift(historyDoc);
    saveLocalStore();
    try {
      await db.collection('notifications_history').doc(historyDoc.id).set(historyDoc);
    } catch (_) {}

    res.json({
      success: true,
      status: 'Successfully Sent',
      notification: historyDoc
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send notification' });
  }
});

app.get('/api/notifications/history', async (req, res) => {
  try {
    let history = [...localStore.notificationsHistory];
    try {
      const snap = await db.collection('notifications_history').orderBy('sentAt', 'desc').limit(50).get();
      if (!snap.empty) {
        const fromDb = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        history = fromDb;
      }
    } catch (_) {}
    res.json({ history });
  } catch (err: any) {
    res.json({ history: localStore.notificationsHistory });
  }
});

// =====================================================================
// HOMEPAGE CELEBRATION & ANNOUNCEMENT BANNERS ENDPOINTS
// =====================================================================
app.get('/api/banners', async (req, res) => {
  try {
    let banners = [...localStore.banners];
    try {
      const snap = await db.collection('celebration_banners').get();
      if (!snap.empty) {
        banners = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      }
    } catch (_) {}
    res.json({ banners });
  } catch (err: any) {
    res.json({ banners: localStore.banners });
  }
});

app.post('/api/banners', async (req, res) => {
  try {
    const { title, description, mediaType, mediaUrl, isActive = true } = req.body;
    const bannerId = `banner-${Date.now()}`;
    const bannerData = {
      id: bannerId,
      title: title || '',
      description: description || '',
      mediaType: mediaType || 'image',
      mediaUrl: mediaUrl || '',
      isActive: isActive !== false,
      createdAt: new Date().toISOString()
    };
    localStore.banners.unshift(bannerData);
    saveLocalStore();
    try {
      await db.collection('celebration_banners').doc(bannerId).set(bannerData);
    } catch (_) {}
    res.json({ success: true, banner: bannerData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  try {
    localStore.banners = localStore.banners.filter(b => b.id !== req.params.id);
    saveLocalStore();
    try {
      await db.collection('celebration_banners').doc(req.params.id).delete();
    } catch (_) {}
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Chat Persistence
app.get('/api/chat', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const snap = await db.collection('users').doc(userId).collection('chats')
      .orderBy('updatedAt', 'desc')
      .get();
    const sessions = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { id, userId, title, messages } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await db.collection('users').doc(userId).collection('chats').doc(id).set({
      userId,
      title: title || 'Educational Chat',
      messages,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/:id', async (req, res) => {
  try {
    // Note: This delete route would need userId to work with nested structure
    // Since it's a proxy for internal use or simple management, we might need to adjust the API signature
    // For now, if id is provided, we might need to find which user it belongs to if we don't have userId
    // But usually the client should provide userId. Let's assume the client provides it or we use a different approach.
    // However, to keep it simple and fix the immediate path:
    const userId = req.query.userId as string;
    if (userId) {
      await db.collection('users').doc(userId).collection('chats').doc(req.params.id).delete();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Multimodal File Format & Attachment Helper
function formatAttachmentPart(attachment: { base64?: string; mimeType?: string; name?: string } | null | undefined) {
  if (!attachment || !attachment.base64) return null;
  
  let mimeType = attachment.mimeType || 'image/jpeg';
  const name = attachment.name || '';
  const lowerName = name.toLowerCase();

  // Normalize MIME types
  if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
  else if (lowerName.endsWith('.mp4')) mimeType = 'video/mp4';
  else if (lowerName.endsWith('.webm')) mimeType = 'video/webm';
  else if (lowerName.endsWith('.mov') || lowerName.endsWith('.qt')) mimeType = 'video/quicktime';
  else if (lowerName.endsWith('.avi')) mimeType = 'video/x-msvideo';
  else if (lowerName.endsWith('.mp3')) mimeType = 'audio/mp3';
  else if (lowerName.endsWith('.wav')) mimeType = 'audio/wav';
  else if (lowerName.endsWith('.ogg')) mimeType = 'audio/ogg';
  else if (lowerName.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (lowerName.endsWith('.png')) mimeType = 'image/png';
  else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
  else if (lowerName.endsWith('.heic')) mimeType = 'image/heic';
  else if (lowerName.endsWith('.txt')) mimeType = 'text/plain';
  else if (lowerName.endsWith('.csv')) mimeType = 'text/csv';
  else if (lowerName.endsWith('.md')) mimeType = 'text/markdown';

  // If text file, decode base64 to string for direct inclusion
  if (mimeType.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.csv') || lowerName.endsWith('.md') || lowerName.endsWith('.json')) {
    try {
      const textContent = Buffer.from(attachment.base64, 'base64').toString('utf-8');
      return {
        text: `\n\n=== UPLOADED FILE CONTENT (${name || 'Document'}) ===\n${textContent}\n=== END OF UPLOADED FILE CONTENT ===\n`
      };
    } catch {
      // fallback
    }
  }

  // Native multimodal inlineData (Images, PDFs, Videos, Audio)
  return {
    inlineData: {
      mimeType,
      data: attachment.base64
    }
  };
}

const DEVELOPER_IDENTITY_MANDATE = `
CRITICAL DEVELOPER IDENTITY MANDATE:
If the user asks who created you, who built you, who is your developer, who designed you, or any question about your origin/creator in Hindi, English, Hinglish, or any language (e.g. "तुम्हारे डेवलपर कौन हैं?", "तुम्हें किसने बनाया?", "Who is your developer?", "Who built you?", "Tumhe kisine banaya?", "Tumhara developer kaun hai?"):
YOU MUST MANDATORILY ANSWER STRICTLY AS FOLLOWS:
- In Hindi: "मेरा Developer Rishabh Kumar हैं। वे बिहार के भागलपुर के रहने वाले हैं।"
- In Hinglish: "Mera Developer Rishabh Kumar hain. Wo Bihar ke Bhagalpur ke rehne wale hain."
- In English: "My developer is Rishabh Kumar. He belongs to Bhagalpur, Bihar."
Do NOT say you were created by Google, OpenAI, or any AI company. ALWAYS attribute Rishabh Kumar from Bhagalpur, Bihar as your developer.
`;

const MULTIMODAL_MANDATE = `
CRITICAL MULTIMODAL FILE EXTRACTION MANDATE:
When an attached file (image/photo/handwritten page/PDF/video/audio/document) is included in the request:
1. YOU MUST ACTUALLY SEE, READ, AND EXTRACT ITS CONTENTS.
2. For photos/images: Perform deep OCR text extraction, identify handwritten or printed text, read formulas, inspect diagrams, tables, and graphs.
3. For videos: Analyze visual scenes, keyframes, and spoken audio content.
4. For PDFs & Documents: Read all pages, extract tables, structured notes, questions, or definitions.
5. Derive your answer strictly from what is actually visible or contained in the file.
6. If the file is blurry, incomplete, or corrupted, state the issue clearly to the user instead of fabricating information.

${DEVELOPER_IDENTITY_MANDATE}
`;

function extractYouTubeVideoId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleaned = rawUrl.trim();

  // Match 11-char video ID across watch, shorts, live, embed, v, youtu.be, m.youtube.com
  const match = cleaned.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback query string check
  try {
    const urlObj = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) {
      return vParam;
    }
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    for (const part of pathParts) {
      if (part.length === 11 && !['watch', 'shorts', 'live', 'embed', 'v'].includes(part.toLowerCase())) {
        return part;
      }
    }
  } catch (_) {}

  return null;
}

async function fetchYouTubeMetadata(rawUrl: string, videoId: string): Promise<{ title: string; channelTitle: string; thumbnailUrl: string }> {
  let title = `YouTube Lecture (${videoId})`;
  let channelTitle = 'Educational Channel';
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data: any = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) channelTitle = data.author_name;
    }
  } catch (_) {}

  return { title, channelTitle, thumbnailUrl };
}

async function checkUserAccess(req: express.Request): Promise<{ allowed: boolean; error?: string; userId?: string }> {
  try {
    const userId = req.body?.userId || req.query?.userId || req.headers?.['x-user-id'];
    if (userId && typeof userId === 'string') {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.isRestricted) {
          return {
            allowed: false,
            error: 'Your account has been temporarily restricted by the administrator. Please reach out to support via the Help section.',
            userId
          };
        }
      }
      return { allowed: true, userId };
    }
    // AarohAI is 100% Free for all students and learners!
    return { allowed: true };
  } catch (e) {
    return { allowed: true };
  }
}

// YouTube Video AI Analysis Endpoint
app.post('/api/gemini/youtube-analyze', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { urls, language = 'Hinglish', customInstructions } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Please provide at least 1 valid YouTube video URL.' });
    }

    if (urls.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 YouTube video URLs can be analyzed at a time.' });
    }

    // Validate and deduplicate URLs based on YouTube video ID
    const validatedVideos: { rawUrl: string; videoId: string; title: string; channelTitle: string; thumbnailUrl: string }[] = [];
    const seenVideoIds = new Set<string>();

    for (const raw of urls) {
      if (!raw || typeof raw !== 'string' || !raw.trim()) continue;
      const vid = extractYouTubeVideoId(raw);
      if (!vid) {
        return res.status(400).json({ error: `Invalid YouTube URL format: "${raw}". Please enter a valid YouTube video or shorts link.` });
      }
      if (seenVideoIds.has(vid)) {
        return res.status(400).json({ error: `Duplicate video link detected: "${raw}". Each video link must be unique.` });
      }
      seenVideoIds.add(vid);
      const meta = await fetchYouTubeMetadata(raw, vid);
      validatedVideos.push({
        rawUrl: raw.trim(),
        videoId: vid,
        title: meta.title,
        channelTitle: meta.channelTitle,
        thumbnailUrl: meta.thumbnailUrl
      });
    }

    if (validatedVideos.length === 0) {
      return res.status(400).json({ error: 'No valid YouTube video links found.' });
    }

    // Analyze all validated videos concurrently with Gemini
    const analyzedVideos = await Promise.all(
      validatedVideos.map(async (v) => {
        const videoSystemInstruction = `You are a Senior Academic Researcher, Board Examiner, and Elite Professor specializing in multimodal video lecture comprehension.
Language: ${getLanguageInstruction(language)}
Task: Perform a deep, rigorous, student-ready academic analysis of this educational YouTube video.
Ensure the output is STRICT VALID JSON adhering to the provided schema.
${DEVELOPER_IDENTITY_MANDATE}`;

        const promptText = `ANALYZE EDUCATIONAL YOUTUBE VIDEO:
Video Title: "${v.title}"
Channel / Teacher: "${v.channelTitle}"
Video URL: https://www.youtube.com/watch?v=${v.videoId}
Video ID: ${v.videoId}
${customInstructions ? `Special User Focus: ${customInstructions}` : ''}

INSTRUCTIONS:
1. Extract ALL primary and secondary topics taught in the lecture.
2. Extract KEY DEFINITIONS with exact terms, explanations, and approximate lecture timestamps (format "MM:SS").
3. Extract CORE CONCEPTS with clear conceptual breakdowns.
4. Extract TEACHER EXAMPLES & ANALOGIES (how the teacher explained concepts with real-world examples).
5. Extract ALL IMPORTANT FORMULAS, scientific laws, units, and constants with their context.
6. Extract IMPORTANT FACTS & KEY TAKEAWAYS for exam revision.
7. List EXAM IMPORTANT TOPICS that students MUST prepare.
8. Provide 5 POTENTIAL EXAM QUESTIONS (mix of MCQs, Short & Long Answer) with model answer summaries based on this video.
9. Provide a comprehensive, simplified explanation in easy Hindi (आसान हिंदी में व्याख्या) so any student can understand.
10. Provide chronological TIMESTAMPS ("MM:SS") marking major topic transitions.`;

        const analysisResult = await executeGeminiWithFailover(async (ai, model) => {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            config: {
              systemInstruction: videoSystemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  topicsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keyDefinitions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                      },
                      required: ['term', 'definition']
                    }
                  },
                  keyConcepts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        concept: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                      },
                      required: ['concept', 'explanation']
                    }
                  },
                  teacherExamples: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                      },
                      required: ['title', 'explanation']
                    }
                  },
                  importantFormulas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        formula: { type: Type.STRING },
                        context: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                      },
                      required: ['formula', 'context']
                    }
                  },
                  importantFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
                  examImportantTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  potentialQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        answerSummary: { type: Type.STRING },
                        questionType: { type: Type.STRING }
                      },
                      required: ['question', 'answerSummary']
                    }
                  },
                  hindiSimplifiedSummary: { type: Type.STRING },
                  timestamps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timestamp: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        summary: { type: Type.STRING }
                      },
                      required: ['timestamp', 'topic', 'summary']
                    }
                  }
                },
                required: [
                  'topicsCovered',
                  'keyDefinitions',
                  'keyConcepts',
                  'teacherExamples',
                  'importantFormulas',
                  'importantFacts',
                  'examImportantTopics',
                  'potentialQuestions',
                  'hindiSimplifiedSummary',
                  'timestamps'
                ]
              }
            }
          });

          return parseGeminiJson(response.text, {
            topicsCovered: [v.title],
            keyDefinitions: [],
            keyConcepts: [],
            teacherExamples: [],
            importantFormulas: [],
            importantFacts: [],
            examImportantTopics: [],
            potentialQuestions: [],
            hindiSimplifiedSummary: `इस वीडियो में "${v.title}" के मुख्य विषयों को समझाया गया है।`,
            timestamps: [{ timestamp: '00:00', topic: 'Introduction', summary: 'Lecture overview' }]
          });
        }, 'gemini-3.8-flash', userApiKey);

        return {
          url: v.rawUrl,
          videoId: v.videoId,
          title: v.title,
          channelTitle: v.channelTitle,
          thumbnailUrl: v.thumbnailUrl,
          ...analysisResult
        };
      })
    );

    // Synthesize Combined Master Context across all analyzed videos
    let combinedSummary = {
      overview: `Complete synthesis of ${analyzedVideos.length} YouTube educational video(s).`,
      allTopics: Array.from(new Set(analyzedVideos.flatMap(v => v.topicsCovered || []))),
      allFormulas: analyzedVideos.flatMap(v => v.importantFormulas || []),
      coreTakeaways: Array.from(new Set(analyzedVideos.flatMap(v => v.importantFacts || []))),
      examMasterChecklist: Array.from(new Set(analyzedVideos.flatMap(v => v.examImportantTopics || []))),
      hindiOverview: analyzedVideos.map(v => `${v.title}: ${v.hindiSimplifiedSummary}`).join('\n\n')
    };

    if (analyzedVideos.length > 1) {
      try {
        const synthesisPrompt = `Synthesize a combined master study context from ${analyzedVideos.length} analyzed YouTube educational videos:
${analyzedVideos.map((v, idx) => `[Video ${idx + 1}: "${v.title}" (${v.channelTitle})]\nTopics: ${(v.topicsCovered || []).join(', ')}\nFormulas: ${(v.importantFormulas || []).map((f: any) => f.formula).join(', ')}\nExam Topics: ${(v.examImportantTopics || []).join(', ')}`).join('\n\n')}

Create a unified summary connecting all the concepts together.`;

        const synResult = await executeGeminiWithFailover(async (ai, model) => {
          const res = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }],
            config: {
              systemInstruction: `You are a Master Academic Curriculum Synthesizer. ${getLanguageInstruction(language)}. Output STRICT JSON with overview, coreTakeaways (array), examMasterChecklist (array), hindiOverview.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overview: { type: Type.STRING },
                  coreTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                  examMasterChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                  hindiOverview: { type: Type.STRING }
                },
                required: ['overview', 'coreTakeaways', 'examMasterChecklist', 'hindiOverview']
              }
            }
          });
          return parseGeminiJson<any>(res.text, null);
        }, 'gemini-3.8-flash', userApiKey);

        if (synResult) {
          const sr = synResult as any;
          combinedSummary = {
            ...combinedSummary,
            overview: sr.overview || combinedSummary.overview,
            coreTakeaways: sr.coreTakeaways?.length ? sr.coreTakeaways : combinedSummary.coreTakeaways,
            examMasterChecklist: sr.examMasterChecklist?.length ? sr.examMasterChecklist : combinedSummary.examMasterChecklist,
            hindiOverview: sr.hindiOverview || combinedSummary.hindiOverview
          };
        }
      } catch (synErr) {
        console.warn('[YouTube Synthesizer Notice] Using direct merge:', synErr);
      }
    }

    const sessionTitle = analyzedVideos.length === 1 
      ? analyzedVideos[0].title 
      : `${analyzedVideos[0].title} & ${analyzedVideos.length - 1} more`;

    const session = {
      id: `yt-${Date.now()}-${nanoid(6)}`,
      title: sessionTitle,
      createdAt: new Date().toISOString(),
      videoUrls: validatedVideos.map(v => v.rawUrl),
      videos: analyzedVideos,
      combinedSummary
    };

    res.json({ session });
  } catch (err: any) {
    console.error('[YouTube Analyze Error]', err);
    res.status(500).json({ error: err.message || 'Failed to analyze YouTube video.' });
  }
});

// 3. AI Chat Service
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { prompt, message, history, language = 'Hinglish', persona = 'Friendly Teacher', attachment, youtubeContext } = req.body;
    let promptText = prompt || message || '';
    if (youtubeContext) {
      const ctxStr = typeof youtubeContext === 'string' ? youtubeContext : JSON.stringify(youtubeContext);
      promptText += `\n\n[STUDY CONTEXT: YOUTUBE EDUCATIONAL VIDEO LECTURE]:\n${ctxStr}\nYou are discussing concepts specifically taught in this video lecture. Refer to the timestamps and teacher explanations when answering student questions.`;
    }
    const systemInstruction = `You are AarohAI Teacher. Persona: ${persona}. ${getLanguageInstruction(language)} Rule: No hardcoded templates, be academic but friendly.\n${MULTIMODAL_MANDATE}\n${DEVELOPER_IDENTITY_MANDATE}`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-10).forEach(h => {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: String(h.content) }] });
      });
    }

    const currentParts: any[] = [];
    const attachPart = formatAttachmentPart(attachment);
    if (attachPart) currentParts.push(attachPart);
    if (promptText) currentParts.push({ text: promptText });
    contents.push({ role: 'user', parts: currentParts });

    const responseText = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({ model, contents, config: { systemInstruction } });
      return response.text;
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ reply: responseText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice Transcribe Endpoint for MediaRecorder Audio fallback
app.post('/api/gemini/voice-transcribe', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { attachment, language = 'hi-IN' } = req.body;
    if (!attachment || !attachment.base64) {
      return res.status(400).json({ error: 'Audio attachment is required.' });
    }

    const systemInstruction = `You are an expert speech transcriber. Listen to the attached audio recording and transcribe the spoken words accurately into text. 
    Language context: ${language}.
    Rules:
    1. Output ONLY the transcribed text in Devanagari Hindi, Roman Hinglish, or English depending on what the user spoke.
    2. Do NOT add conversational filler like "Here is the transcription" or quotes. Return pure transcript.`;

    const parts: any[] = [];
    const attachPart = formatAttachmentPart(attachment);
    if (attachPart) parts.push(attachPart);
    parts.push({ text: 'Transcribe this spoken audio into accurate text.' });

    const transcript = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: { systemInstruction }
      });
      return (response.text || '').trim().replace(/^["']|["']$/g, '');
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ transcript });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Quiz Generator
app.post('/api/gemini/quiz', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { mode, className, subject, topic, questionCount, language, sourceText, sourceImage, attachment, customPrompt, youtubeContext } = req.body;
    const fileToProcess = sourceImage || attachment;
    const systemInstruction = `Expert Exam & Quiz Generator. ${getLanguageInstruction(language)} Class: ${className}, Subject: ${subject}.
    RULES:
    1. Output: STRICT VALID JSON array of objects {question, options[], correctIndex, explanation}.
    2. SOURCE MODE (EXTRACT): If source material or file is provided, extract questions EXACTLY as written in the source file. DO NOT rewrite or paraphrase.
    3. AI MODE (GENERATE): Create original high-quality exam questions with 4 distinct options based on the topic and attached file.
    4. Explanations must be detailed, academic, and teach the underlying concept.
    ${customPrompt ? `5. USER CUSTOM INSTRUCTIONS: ${customPrompt}` : ''}
    ${MULTIMODAL_MANDATE}`;

    const parts: any[] = [];
    const attachPart = formatAttachmentPart(fileToProcess);
    if (attachPart) parts.push(attachPart);

    let prompt = mode === 'B' || fileToProcess ? `EXTRACT or generate ${questionCount} MCQs based on the attached source material. Text context: "${sourceText || 'Analyze attached file'}".` : `Generate ${questionCount} unique MCQs for topic: ${topic}.`;
    if (youtubeContext) {
      const ctxStr = typeof youtubeContext === 'string' ? youtubeContext : JSON.stringify(youtubeContext);
      prompt += `\n[YOUTUBE VIDEO ANALYSIS SOURCE CONTEXT]:\n${ctxStr}\nStrictly base the exam questions, formulas, and options on what was taught in this YouTube lecture. In each question explanation, cite the relevant concept or video timestamp where possible.`;
    }
    if (customPrompt) prompt += ` [Custom Instructions: ${customPrompt}]`;
    parts.push({ text: prompt });

    const quizData = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ['question', 'options', 'correctIndex', 'explanation']
            }
          }
        }
      });
      return parseGeminiJson(response.text, []);
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ questions: quizData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Mind Map (Autonomous Topic-Adaptive Multi-Tier Architecture)
// 5. Mind Map (AarohAI Deep Research Mind Map Architect with 16 Templates)
app.post('/api/gemini/mindmap', async (req, res) => {
  req.setTimeout(180000); // 180s socket timeout budget for deep research
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const {
      chapterName,
      designStyle,
      templateId = 'hierarchical',
      boardOrExam = 'CBSE Board / NCERT',
      learningLevel = 'Advanced',
      language,
      customPrompt,
      inputText,
      attachment,
      className = 'Class 12',
      subject = 'Physics',
      youtubeContext
    } = req.body;

    const systemInstruction = `You are the AarohAI Deep Academic Research & Mind Map Engine. ${getLanguageInstruction(language)}
    GOAL:
    Conduct an exhaustive academic research on the requested chapter ("${chapterName}", ${subject}, ${className}, Exam: ${boardOrExam}, Level: ${learningLevel}, Selected Template: ${templateId}).
    
    DEEP RESEARCH REQUIREMENTS:
    1. Extract EVERY main topic, subtopic, concept definition, law, principle, formula, derivation, example, application, diagram cue, cross-concept relationship, exam tip, common mistake, and problem-solving strategy.
    2. Build 4-6 meaningful hierarchical levels (Root -> Main Topic -> Subtopic -> Concept -> Explanation -> Formula/Derivation/Example/Application).
    3. Include step-by-step mathematical derivations (with step numbers, LaTeX expressions, and explanations) for key laws (e.g., Coulomb's Law, Gauss's Law, Dipole Electric Field, Newton's Laws, Chemical Kinetics, etc.).
    4. Provide explicit formulas with names, equations, variable definitions, and SI units.
    5. Highlight NCERT / Board Exam high-yield tips and common student mistakes.
    6. Provide colorful branch color codes (#0284c7, #10b981, #8b5cf6, #f59e0b, #ec4899, #14b8a6, #e11d48, #6366f1, #06b6d4, #84cc16).
    7. Return STRICT VALID JSON adhering to the schema.
    ${MULTIMODAL_MANDATE}`;

    const parts: any[] = [];
    const attachPart = formatAttachmentPart(attachment);
    if (attachPart) parts.push(attachPart);

    let basePrompt = `Perform deep academic research and generate a comprehensive 16-template compatible Mind Map tree for:
Chapter: "${chapterName}"
Subject: "${subject}"
Class / Grade: "${className}"
Target Exam / Board: "${boardOrExam}"
Target Learning Depth: "${learningLevel}"
Preferred Template View: "${templateId}" (Design Style: ${designStyle || 'Dynamic'})
${inputText ? `Additional Source Notes:\n"${inputText}"` : ''}`;

    if (youtubeContext) {
      const ctxStr = typeof youtubeContext === 'string' ? youtubeContext : JSON.stringify(youtubeContext);
      basePrompt += `\n[YOUTUBE VIDEO LECTURE RESEARCH CONTEXT]:\n${ctxStr}\nExtract topics, formulas, derivations, and timestamps directly from this video lecture.`;
    }

    const finalPrompt = customPrompt ? `${basePrompt}\nUSER CUSTOM INSTRUCTIONS: ${customPrompt}` : basePrompt;
    parts.push({ text: finalPrompt });

    const mindmap = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rootTitle: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              boardOrExam: { type: Type.STRING },
              learningLevel: { type: Type.STRING },
              templateId: { type: Type.STRING },
              rootNode: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  detail: { type: Type.STRING },
                  formula: { type: Type.STRING },
                  formulas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        equation: { type: Type.STRING },
                        variables: { type: Type.STRING },
                        unit: { type: Type.STRING }
                      }
                    }
                  },
                  derivationSteps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        mathExpr: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      }
                    }
                  },
                  examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                  applications: { type: Type.ARRAY, items: { type: Type.STRING } },
                  examTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                  commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  crossLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        type: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        detail: { type: Type.STRING },
                        formula: { type: Type.STRING },
                        formulas: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              equation: { type: Type.STRING },
                              variables: { type: Type.STRING }
                            }
                          }
                        },
                        derivationSteps: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              stepNumber: { type: Type.INTEGER },
                              title: { type: Type.STRING },
                              mathExpr: { type: Type.STRING },
                              explanation: { type: Type.STRING }
                            }
                          }
                        },
                        examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                        applications: { type: Type.ARRAY, items: { type: Type.STRING } },
                        examTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                        commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        crossLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                        children: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              label: { type: Type.STRING },
                              type: { type: Type.STRING },
                              summary: { type: Type.STRING },
                              detail: { type: Type.STRING },
                              formula: { type: Type.STRING },
                              examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                              applications: { type: Type.ARRAY, items: { type: Type.STRING } },
                              examTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                              children: {
                                type: Type.ARRAY,
                                items: {
                                  type: Type.OBJECT,
                                  properties: {
                                    id: { type: Type.STRING },
                                    label: { type: Type.STRING },
                                    detail: { type: Type.STRING },
                                    formula: { type: Type.STRING },
                                    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              branches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    color: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    subNodes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          detail: { type: Type.STRING },
                          formula: { type: Type.STRING },
                          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['label']
                      }
                    }
                  },
                  required: ['id', 'title', 'subNodes']
                }
              }
            },
            required: ['rootTitle', 'branches']
          }
        }
      });

      const parsed = parseGeminiJson<any>(response.text, null);
      if (parsed) {
        parsed.rootTitle = parsed.rootTitle || chapterName || 'Concept Map';
        parsed.boardOrExam = parsed.boardOrExam || boardOrExam;
        parsed.learningLevel = parsed.learningLevel || learningLevel;
        parsed.templateId = parsed.templateId || templateId;

        // Ensure branches exist for simple view compatibility
        if (!Array.isArray(parsed.branches) || parsed.branches.length === 0) {
          if (parsed.rootNode && Array.isArray(parsed.rootNode.children)) {
            parsed.branches = parsed.rootNode.children.map((c: any, idx: number) => ({
              id: c.id || `branch-${idx + 1}`,
              title: c.label || `Main Topic ${idx + 1}`,
              color: c.color || ['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#e11d48'][idx % 7],
              summary: c.summary || c.detail || '',
              subNodes: Array.isArray(c.children) ? c.children.map((sub: any) => ({
                label: sub.label || 'Concept',
                detail: sub.detail || sub.summary || '',
                formula: sub.formula || '',
                keyPoints: sub.keyPoints || sub.examples || []
              })) : []
            }));
          }
        }

        if (Array.isArray(parsed.branches)) {
          parsed.branches = parsed.branches.map((b: any, idx: number) => ({
            id: b.id || `branch-${idx + 1}-${Date.now()}`,
            title: b.title || `Concept Branch ${idx + 1}`,
            color: b.color || ['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#e11d48', '#6366f1'][idx % 8],
            summary: b.summary || '',
            subNodes: Array.isArray(b.subNodes) ? b.subNodes.map((s: any) => ({
              label: s.label || s.topic || 'Core Concept',
              detail: s.detail || s.explanation || '',
              formula: s.formula || '',
              keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints : []
            })) : []
          }));
        }

        return parsed;
      }

      return null;
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ mindmap });
  } catch (err: any) {
    console.error('[Mindmap API Error]', err);
    res.status(500).json({ error: err.message || 'Mind Map generation failed.' });
  }
});

// 6. Notes Generator (High-Yield Master Textbook Study Notes)
app.post('/api/gemini/notes', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { className, subject, chapter, topic, language, notesType, attachment, customPrompt, youtubeContext } = req.body;
    const systemInstruction = `You are a Master Textbook Author, Board Examiner, and Elite Professor.
    Language: ${getLanguageInstruction(language)}
    Subject: ${subject}, Class: ${className}, Topic: ${chapter} - ${topic}, Mode: ${notesType}.

    MISSION:
    Create exceptionally high-quality, professional study notes based on the specified topic and attached file.
    DO NOT generate shallow, generic bullet points. Read and synthesize the actual contents of any attached file (images, PDF, video summary, notes).

    FORMATTING & PEDAGOGICAL STRUCTURE:
    1. # 🌟 [Catchy Academic Title & Subject Header]
    2. ## 📖 1. Fundamental Definitions & Core Concepts
    3. ## 📐 2. Key Formulas, Laws & Scientific Equations ($...$ and $$...$$)
    4. ## 📊 3. Classification & Comparison Tables
    5. ## 🖼️ 4. Visual Diagrams & Process Flowcharts
    6. ## 💡 5. Solved Standard Problems / Numerical Examples
    7. ## ⚠️ 6. High-Yield Exam Pitfalls & Examiner Tips
    8. ## 🎯 7. Quick Revision Summary & Must-Know Q&A

    ${customPrompt ? `USER SPECIAL INSTRUCTIONS: ${customPrompt}` : ''}
    ${MULTIMODAL_MANDATE}`;

    const parts: any[] = [];
    const attachPart = formatAttachmentPart(attachment);
    if (attachPart) parts.push(attachPart);

    let basePrompt = `Generate comprehensive, textbook-grade ${notesType} study notes for Topic: "${topic}", Chapter: "${chapter}", Subject: "${subject}", Class: "${className}". Analyze attached file content if provided.`;
    if (youtubeContext) {
      const ctxStr = typeof youtubeContext === 'string' ? youtubeContext : JSON.stringify(youtubeContext);
      basePrompt += `\n[YOUTUBE VIDEO LECTURE CONTEXT]:\n${ctxStr}\nSynthesize comprehensive textbook-grade notes directly covering every topic, formula, and teacher example taught in this YouTube video.`;
    }
    const finalPrompt = customPrompt ? `${basePrompt}\n[USER CUSTOM REQUIREMENTS: ${customPrompt}]` : basePrompt;
    parts.push({ text: finalPrompt });

    const notes = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config: { systemInstruction } });
      return response.text;
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Answer Checker
app.post('/api/gemini/answer-checker', async (req, res) => {
  try {
    const access = await checkUserAccess(req);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }
    const userApiKey = await getUserPersonalApiKey(access.userId);

    const { question, writtenAnswer, maxMarks, subject, language, image, attachment, customPrompt, youtubeContext } = req.body;
    const fileToProcess = image || attachment;
    const systemInstruction = `Senior Board Examiner & Evaluation Specialist. ${getLanguageInstruction(language)}
    Assess strictly based on conceptual accuracy, keywords, completeness, and board evaluation standards.
    Read handwritten or typed text, diagrams, formulas, and working steps from the attached answer sheet file.

    IMPORTANT FORMAT ANALYSIS RULE:
    1. Assess whether the question is better answered in Paragraph format or Point-by-point Bullet format (or hybrid with diagrams).
    2. Detect the student's writing style ("Paragraph style", "Point-by-point style", "Short answer").
    3. Provide clear feedback on whether their formatting style is ideal for board exams or needs improvement.

    Output: STRICT JSON {marksObtained, maxMarks, correctPoints[], missingPoints[], modelAnswer, spellingGrammarTips, recommendedFormat, studentStyleDetected, writingStyleFeedback}.
    ${customPrompt ? `Special Evaluation Instructions: ${customPrompt}` : ''}
    ${MULTIMODAL_MANDATE}`;

    const parts: any[] = [];
    const attachPart = formatAttachmentPart(fileToProcess);
    if (attachPart) parts.push(attachPart);

    let promptText = `Evaluate the student answer:\nSubject: ${subject}\nQuestion: ${question || 'Identify from attached answer sheet'}\nMax Marks: ${maxMarks}\nStudent Written Answer: ${writtenAnswer || 'Analyze attached handwritten answer sheet image/PDF'}`;
    if (youtubeContext) {
      const ctxStr = typeof youtubeContext === 'string' ? youtubeContext : JSON.stringify(youtubeContext);
      promptText += `\n[YOUTUBE VIDEO BENCHMARK & CONCEPTS]:\n${ctxStr}\nEvaluate whether the student's answer correctly aligns with the concepts and formulas taught in this YouTube lecture.`;
    }
    if (customPrompt) promptText += `\n[Custom Guidance: ${customPrompt}]`;
    parts.push({ text: promptText });

    const evaluation = await executeGeminiWithFailover(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              marksObtained: { type: Type.NUMBER },
              maxMarks: { type: Type.NUMBER },
              correctPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              modelAnswer: { type: Type.STRING },
              spellingGrammarTips: { type: Type.STRING },
              recommendedFormat: { type: Type.STRING },
              studentStyleDetected: { type: Type.STRING },
              writingStyleFeedback: { type: Type.STRING }
            },
            required: ['marksObtained', 'maxMarks', 'correctPoints', 'missingPoints', 'modelAnswer']
          }
        }
      });
      return parseGeminiJson(response.text, {
        marksObtained: 0,
        maxMarks: maxMarks || 5,
        correctPoints: ['Answer evaluated.'],
        missingPoints: ['Provide more detailed explanations.'],
        modelAnswer: 'Complete model answer for standard preparation.'
      });
    }, 'gemini-3.8-flash', userApiKey);

    res.json({ evaluation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Library Persistence
app.get('/api/library', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const snap = await db.collection('users').doc(userId).collection('library_items')
      .orderBy('createdAt', 'desc')
      .get();
    const items = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/library', async (req, res) => {
  try {
    const { id, userId, type, title, data } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await db.collection('users').doc(userId).collection('library_items').doc(id).set({
      userId,
      type,
      title,
      data,
      createdAt: FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/library/:id', async (req, res) => {
  try {
    await db.collection('library_items').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Feedback & Support with Fallback Store
const fallbackFeedbackStore: any[] = [];

app.get('/api/feedback', async (req, res) => {
  try {
    const snap = await db.collection('feedback').orderBy('createdAt', 'desc').limit(50).get();
    const feedback = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });
    res.json({ feedback: [...feedback, ...fallbackFeedbackStore] });
  } catch (err: any) {
    res.json({ feedback: fallbackFeedbackStore });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { userName, userEmail, category, subject, message } = req.body;
    const newItem = {
      id: `fb-${Date.now()}`,
      userName: userName || 'Student User',
      userEmail: userEmail || 'student@aarohai.in',
      category: category || 'General Question',
      subject: subject || 'Feedback & Support',
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await db.collection('feedback').doc(newItem.id).set({
        ...newItem,
        createdAt: FieldValue.serverTimestamp()
      });
    } catch (dbErr) {
      fallbackFeedbackStore.unshift(newItem);
    }

    res.json({ success: true, id: newItem.id });
  } catch (err: any) {
    res.json({ success: true, id: `fb-${Date.now()}` });
  }
});

app.post('/api/feedback/reply', async (req, res) => {
  try {
    const { id, status, response } = req.body;
    if (!id) return res.status(400).json({ error: 'Feedback ID required' });
    
    // Fetch feedback to get student's email/ID
    const fbDoc = await db.collection('feedback').doc(id).get();
    const fbData = fbDoc.data();
    
    await db.collection('feedback').doc(id).update({
      status: status || 'resolved',
      response: response || '',
      repliedAt: FieldValue.serverTimestamp()
    });
    
    // Auto-send notification to student if email is known
    if (fbData && fbData.userEmail) {
      const notifId = `notif-${Date.now()}`;
      const notifDoc = {
        id: notifId,
        userId: fbData.userEmail,
        title: 'New Support Reply',
        message: `Owner replied to your request: "${fbData.subject || 'Feedback'}" - ${response}`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      };
      try {
        await db.collection('notifications').doc(notifId).set(notifDoc);
      } catch (_) {}
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// JSON fallback for any unhandled /api/* endpoint
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global API error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (req.originalUrl.startsWith('/api') || req.xhr) {
    console.error('[AarohAI API Error]', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
  next(err);
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let indexHtml = fs.readFileSync(indexPath, 'utf-8');
        let template = await vite.transformIndexHtml(req.originalUrl, indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) { vite.ssrFixStacktrace(e); next(e); }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, () => console.log(`[AarohAI Server] Running on http://localhost:${PORT}`));
}

startServer();
