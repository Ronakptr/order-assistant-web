import {
  fetchActivityLogs,
  fetchActivityLogsByUser,
} from "../api/activityLogs";

const ACTIVITY_EVENT_NAME = "order-assistant-activity-log-updated";
const MAX_ACTIVITY_LOGS = 500;
const AUTO_SYNC_INTERVAL_MS = 5000;

let serverActivityLogsCache = [];
let syncInProgress = false;
let lastSyncAt = 0;

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  const possibleKeys = ["currentUser", "user", "authUser", "oa_user"];

  for (const key of possibleKeys) {
    const user = safeJsonParse(localStorage.getItem(key), null);
    if (user && typeof user === "object") return user;
  }

  return null;
}

function getCurrentUserId() {
  const user = getStoredUser();

  return (
    user?.id ||
    user?.uid ||
    user?.user_id ||
    user?.userId ||
    user?.sub ||
    null
  );
}

function getCurrentCompanyId() {
  const user = getStoredUser();

  return (
    user?.company_id ||
    user?.companyId ||
    user?.owner_id ||
    user?.ownerId ||
    user?.id ||
    "default"
  );
}

function getActivityStorageKey() {
  return `oa_activity_logs_company_${getCurrentCompanyId()}`;
}

function normalizeLog(log) {
  const user = getStoredUser();
  const now = new Date().toISOString();

  return {
    id: log?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,

    type: log?.type || log?.action_type || "general",
    action_type: log?.action_type || log?.type || "general",

    title: log?.title || "فعالیت",
    description: log?.description || "",

    createdAt: log?.createdAt || log?.created_at || now,
    created_at: log?.created_at || log?.createdAt || now,

    userId: log?.userId || log?.user_id || getCurrentUserId(),
    user_id: log?.user_id || log?.userId || getCurrentUserId(),

    username:
      log?.username ||
      log?.userName ||
      user?.full_name ||
      user?.name ||
      user?.username ||
      "",

    role:
      log?.role ||
      log?.userRole ||
      user?.role_label ||
      user?.role ||
      "",

    companyId: log?.companyId || log?.company_id || getCurrentCompanyId(),
    company_id: log?.company_id || log?.companyId || getCurrentCompanyId(),

    targetUserId: log?.targetUserId || log?.target_user_id || null,
    target_user_id: log?.target_user_id || log?.targetUserId || null,

    targetUsername: log?.targetUsername || log?.target_username || "",
    target_username: log?.target_username || log?.targetUsername || "",

    targetRole: log?.targetRole || log?.target_role || "",
    target_role: log?.target_role || log?.targetRole || "",

    entityType: log?.entityType || log?.entity_type || "",
    entity_type: log?.entity_type || log?.entityType || "",

    entityId: log?.entityId || log?.entity_id || null,
    entity_id: log?.entity_id || log?.entityId || null,

    method: log?.method || "",
    path: log?.path || "",
    status_code: log?.status_code || null,
  };
}

function getLocalActivityLogs() {
  const logs = safeJsonParse(localStorage.getItem(getActivityStorageKey()), []);

  if (!Array.isArray(logs)) return [];

  return logs.map(normalizeLog);
}

function saveLocalActivityLogs(logs) {
  localStorage.setItem(
    getActivityStorageKey(),
    JSON.stringify(logs.slice(0, MAX_ACTIVITY_LOGS))
  );
}

function sortLogs(logs) {
  return logs
    .map(normalizeLog)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function autoSyncActivityLogs() {
  if (syncInProgress) return;

  const now = Date.now();

  if (now - lastSyncAt < AUTO_SYNC_INTERVAL_MS) return;

  syncInProgress = true;
  lastSyncAt = now;

  try {
    const logs = await fetchActivityLogs(500);
    serverActivityLogsCache = Array.isArray(logs) ? sortLogs(logs) : [];

    window.dispatchEvent(
      new CustomEvent(ACTIVITY_EVENT_NAME, {
        detail: null,
      })
    );
  } catch {
    // کاربر غیرمدیر 403 می‌گیرد؛ اینجا لازم نیست خطا نشان بدهیم.
  } finally {
    syncInProgress = false;
  }
}

export async function syncActivityLogsFromServer(limit = 500) {
  try {
    const logs = await fetchActivityLogs(limit);
    serverActivityLogsCache = Array.isArray(logs) ? sortLogs(logs) : [];
    lastSyncAt = Date.now();

    window.dispatchEvent(
      new CustomEvent(ACTIVITY_EVENT_NAME, {
        detail: null,
      })
    );

    return serverActivityLogsCache;
  } catch {
    return getActivityLogs();
  }
}

export async function syncActivityLogsByUserFromServer(userId, limit = 300) {
  try {
    const logs = await fetchActivityLogsByUser(userId, limit);
    return Array.isArray(logs) ? sortLogs(logs) : [];
  } catch {
    return getActivityLogsByUser({ id: userId });
  }
}

export function getActivityLogs() {
  autoSyncActivityLogs();

  const sourceLogs =
    serverActivityLogsCache.length > 0
      ? serverActivityLogsCache
      : getLocalActivityLogs();

  return sortLogs(sourceLogs);
}

export function getActivityLogsByUser(user) {
  autoSyncActivityLogs();

  const userId = user?.id || user?.uid || user?.user_id || user?.userId;
  const username = user?.username || user?.name || user?.full_name;

  return getActivityLogs().filter((log) => {
    if (userId && String(log.userId) === String(userId)) return true;
    if (userId && String(log.user_id) === String(userId)) return true;
    if (userId && String(log.targetUserId) === String(userId)) return true;
    if (userId && String(log.target_user_id) === String(userId)) return true;

    if (username && log.username === username) return true;
    if (username && log.targetUsername === username) return true;
    if (username && log.target_username === username) return true;

    return false;
  });
}

export function logActivity(log) {
  const nextLog = normalizeLog(log);
  const currentLogs = getLocalActivityLogs();
  const nextLogs = [nextLog, ...currentLogs].slice(0, MAX_ACTIVITY_LOGS);

  saveLocalActivityLogs(nextLogs);

  window.dispatchEvent(
    new CustomEvent(ACTIVITY_EVENT_NAME, {
      detail: nextLog,
    })
  );

  return nextLog;
}

export function clearActivityLogs() {
  localStorage.removeItem(getActivityStorageKey());
  serverActivityLogsCache = [];

  window.dispatchEvent(
    new CustomEvent(ACTIVITY_EVENT_NAME, {
      detail: null,
    })
  );
}

export function getActivityEventName() {
  return ACTIVITY_EVENT_NAME;
}