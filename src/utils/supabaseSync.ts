import { safeStorage } from './safeStorage';
import { VoterCampaignProfile, Influencer, FamilyGroup } from '../types';

export interface BoothSyncBundle {
  version: number;
  partNo: string | number;
  timestamp: number;
  updatedBy?: string;
  profiles: Record<number, VoterCampaignProfile>;
  influencers?: Record<string, Influencer>;
  families?: Record<string, FamilyGroup>;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

const SUPABASE_URL = 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjU3MjEsImV4cCI6MjA5MDIwMTcyMX0.c2_c7CLpalWR4wXmoCyqRdY0642hiHg44rIoYEDA52g';

const SYNC_EMAIL = 'durga@tejobharat.com';
const SYNC_PASSWORD = 'TejoBharat@2024';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SYNC_CATEGORY = 'jsp_booth_sync';

const TOKEN_KEY = 'jsp_supabase_token';
const TOKEN_EXP_KEY = 'jsp_supabase_token_exp';
const LAST_REMOTE_TS_KEY_PREFIX = 'jsp_supabase_last_remote_ts_';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let debounceTimer: any = null;

/**
 * Obtain a valid JWT for Supabase by authenticating with service credentials.
 * Automatically caches token and re-authenticates on expiration.
 */
async function getSupabaseToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  // Check safeStorage
  const storedToken = safeStorage.getItem(TOKEN_KEY);
  const storedExp = parseInt(safeStorage.getItem(TOKEN_EXP_KEY) || '0', 10);
  if (storedToken && storedExp > now + 60000) {
    cachedToken = storedToken;
    tokenExpiresAt = storedExp;
    return storedToken;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: SYNC_EMAIL,
        password: SYNC_PASSWORD
      })
    });

    if (!res.ok) {
      console.warn('Supabase auth failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      cachedToken = data.access_token;
      tokenExpiresAt = (data.expires_at ? data.expires_at * 1000 : now + 3600000);
      safeStorage.setItem(TOKEN_KEY, cachedToken!);
      safeStorage.setItem(TOKEN_EXP_KEY, String(tokenExpiresAt));
      return cachedToken;
    }
  } catch (err) {
    console.warn('Network error during Supabase auth:', err);
  }
  return null;
}

/**
 * Pull the latest sync bundle for a booth from Supabase.
 */
export async function pullBoothFromSupabase(
  partNo: string | number
): Promise<BoothSyncBundle | null> {
  const token = await getSupabaseToken();
  if (!token) return null;

  try {
    const cleanPart = String(partNo);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lookup_values?category=eq.${SYNC_CATEGORY}&value=eq.${encodeURIComponent(
        cleanPart
      )}&select=value,description,updated_at`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].description) {
      try {
        const bundle = JSON.parse(rows[0].description) as BoothSyncBundle;
        if (bundle && bundle.profiles) {
          safeStorage.setItem(
            LAST_REMOTE_TS_KEY_PREFIX + cleanPart,
            String(bundle.timestamp || Date.now())
          );
          return bundle;
        }
      } catch (parseErr) {
        console.warn('Failed to parse remote bundle JSON:', parseErr);
      }
    }
  } catch (err) {
    console.warn('Failed to pull from Supabase:', err);
  }
  return null;
}

/**
 * Push local booth changes to Supabase in the background (debounced).
 */
export function pushBoothToSupabaseDebounced(
  partNo: string | number,
  profiles: Record<number, VoterCampaignProfile>,
  influencers?: Record<string, Influencer>,
  families?: Record<string, FamilyGroup>,
  onStatusChange?: (status: SyncState) => void,
  delayMs = 1500
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  onStatusChange?.('syncing');

  debounceTimer = setTimeout(async () => {
    try {
      const success = await pushBoothToSupabaseImmediate(
        partNo,
        profiles,
        influencers,
        families
      );
      if (success) {
        onStatusChange?.('synced');
        setTimeout(() => onStatusChange?.('idle'), 3000);
      } else {
        onStatusChange?.('error');
      }
    } catch {
      onStatusChange?.('offline');
    }
  }, delayMs);
}

/**
 * Immediately push local booth changes to Supabase.
 */
export async function pushBoothToSupabaseImmediate(
  partNo: string | number,
  profiles: Record<number, VoterCampaignProfile>,
  influencers?: Record<string, Influencer>,
  families?: Record<string, FamilyGroup>
): Promise<boolean> {
  const token = await getSupabaseToken();
  if (!token) return false;

  const cleanPart = String(partNo);
  const now = Date.now();
  const bundle: BoothSyncBundle = {
    version: 1,
    partNo: cleanPart,
    timestamp: now,
    profiles,
    influencers,
    families
  };

  const payload = {
    tenant_id: TENANT_ID,
    category: SYNC_CATEGORY,
    value: cleanPart,
    display_label: `Pithapuram Booth #${cleanPart} Campaign Sync`,
    description: JSON.stringify(bundle),
    is_active: true
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lookup_values?on_conflict=tenant_id,category,value`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
      }
    );

    if (res.ok || res.status === 201 || res.status === 204) {
      safeStorage.setItem(LAST_REMOTE_TS_KEY_PREFIX + cleanPart, String(now));
      return true;
    }
  } catch (err) {
    console.warn('Failed to push to Supabase:', err);
  }
  return false;
}

/**
 * Merge remote bundle into local profiles cleanly.
 * Individual profiles with newer timestamps win.
 */
export function mergeRemoteProfiles(
  local: Record<number, VoterCampaignProfile>,
  remote: Record<number, VoterCampaignProfile>
): { merged: Record<number, VoterCampaignProfile>; hasChanges: boolean } {
  const result: Record<number, VoterCampaignProfile> = { ...local };
  let hasChanges = false;

  Object.entries(remote).forEach(([snoStr, remoteProf]) => {
    const sno = Number(snoStr);
    const localProf = local[sno];

    if (!localProf) {
      result[sno] = remoteProf;
      hasChanges = true;
    } else {
      // Compare timestamp or influencerId / support updates
      const localTime = localProf.updatedAt ? new Date(localProf.updatedAt).getTime() : 0;
      const remoteTime = remoteProf.updatedAt ? new Date(remoteProf.updatedAt).getTime() : 0;

      if (remoteTime >= localTime) {
        // Remote is newer or equal: check if actually different
        const isDiff =
          localProf.influencerId !== remoteProf.influencerId ||
          localProf.supportPct !== remoteProf.supportPct ||
          localProf.survey_status !== remoteProf.survey_status ||
          localProf.customPhone !== remoteProf.customPhone ||
          localProf.notes !== remoteProf.notes;

        if (isDiff) {
          result[sno] = { ...localProf, ...remoteProf };
          hasChanges = true;
        }
      }
    }
  });

  return { merged: result, hasChanges };
}
