import { getStoredUser } from "../api/auth";

export function getCurrentCompanyId() {
  const user = getStoredUser();

  return (
    user?.company_id ||
    user?.companyId ||
    user?.company?.id ||
    user?.company?.company_id ||
    user?.organization_id ||
    user?.organizationId ||
    "default"
  );
}

export function getCompanyScopedKey(baseKey) {
  return `${baseKey}::company:${getCurrentCompanyId()}`;
}

export function getCompanyScopedItem(baseKey) {
  return localStorage.getItem(getCompanyScopedKey(baseKey));
}

export function setCompanyScopedItem(baseKey, value) {
  localStorage.setItem(getCompanyScopedKey(baseKey), value);
}

export function removeCompanyScopedItem(baseKey) {
  localStorage.removeItem(getCompanyScopedKey(baseKey));
}

export function migrateLegacyCompanyScopedItem(baseKey) {
  const scopedKey = getCompanyScopedKey(baseKey);
  const scopedValue = localStorage.getItem(scopedKey);

  if (scopedValue !== null) {
    return scopedValue;
  }

  const legacyValue = localStorage.getItem(baseKey);

  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue);
  }

  return legacyValue;
}
