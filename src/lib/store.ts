import {
  INITIAL_ADMIN_PASSWORD,
  INITIAL_ADMIN_USERNAME,
  type AppState,
  type Profile,
} from "@/types";
import { getSchoolName, locationFromSchool } from "@/lib/locations";
import { hashSecret, nowIso, uid } from "@/lib/utils";

export const STORAGE_KEY = "itag-prop-state-v1";

export async function createInitialState(): Promise<AppState> {
  const createdAt = nowIso();
  const admin: Profile = {
    id: "user_initial_school_head",
    firstName: "School",
    middleName: "",
    lastName: "Head",
    email: INITIAL_ADMIN_USERNAME,
    username: INITIAL_ADMIN_USERNAME,
    passwordHash: await hashSecret(INITIAL_ADMIN_PASSWORD),
    role: "school_head",
    schoolId: null,
    regionId: null,
    provinceId: null,
    municipalityId: null,
    districtId: null,
    active: true,
    mustUpdateCredentials: true,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    profiles: [admin],
    properties: [],
    assignments: [],
    transfers: [],
    propertyHistory: [],
    supplies: [],
    stockTransactions: [],
    verifications: [],
    notifications: [],
    auditLogs: [
      {
        id: uid("audit"),
        userId: admin.id,
        action: "System initialized with School Head setup account",
        recordType: "system",
        recordId: admin.id,
        createdAt,
      },
    ],
    generatedForms: [],
    sessionUserId: null,
  };
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    parsed.profiles = (parsed.profiles ?? []).map((profile) => {
      const municipalityId = profile.municipalityId === "mati" ? "" : profile.municipalityId;
      const fromSchool = locationFromSchool(profile.schoolId);
      return {
        ...profile,
        municipalityId: fromSchool?.municipalityId ?? municipalityId,
        districtId: fromSchool?.districtId ?? profile.districtId,
        provinceId: fromSchool?.provinceId ?? profile.provinceId,
        regionId: fromSchool?.regionId ?? profile.regionId,
        schoolName: fromSchool?.schoolName || getSchoolName(profile.schoolId) || profile.schoolName || "",
      };
    });
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function deriveSupplyStatus(quantity: number, minimum: number) {
  if (quantity <= 0) return "out_of_stock" as const;
  if (quantity <= minimum) return "low_stock" as const;
  return "available" as const;
}
