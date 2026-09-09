import { createContext, useContext } from "react";
import type {
  AppNotification,
  AppState,
  ConsumableSupply,
  InventoryVerification,
  Profile,
  PropertyClassification,
  PropertyCondition,
  PropertyRecord,
  PropertyStatus,
  Role,
} from "@/types";

export type RegisterInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  regionId: string;
  provinceId: string;
  municipalityId: string;
  districtId: string;
  schoolId: string;
  role?: Role;
};

export type PropertyInput = Omit<
  PropertyRecord,
  | "id"
  | "schoolId"
  | "createdBy"
  | "qrCode"
  | "excelGeneratedAt"
  | "createdAt"
  | "updatedAt"
  | "totalCost"
> & { totalCost?: number };

export type AppContextValue = {
  ready: boolean;
  state: AppState;
  user: Profile | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (input: Partial<Profile> & { password?: string }) => Promise<void>;
  replaceSchoolHead: (input: RegisterInput) => Promise<void>;
  createCustodian: (input: RegisterInput) => Promise<void>;
  setCustodianActive: (userId: string, active: boolean) => void;
  encodeProperty: (input: PropertyInput) => PropertyRecord;
  updateProperty: (id: string, input: PropertyInput) => void;
  assignProperty: (input: {
    propertyId: string;
    accountablePerson: string;
    assignedUserId?: string;
    officeDepartment: string;
    location: string;
    dateAssigned: string;
    deadline?: string;
    status?: "pending" | "active" | "completed";
  }) => void;
  transferProperty: (input: {
    propertyId: string;
    newAccountablePerson: string;
    newOffice: string;
    newLocation: string;
    date: string;
    reason: string;
  }) => void;
  verifyProperty: (input: {
    propertyId: string;
    location: string;
    accountablePerson: string;
    condition: PropertyCondition;
    status: PropertyStatus;
    existenceConfirmed: boolean;
    remarks: string;
  }) => void;
  upsertSupply: (input: Omit<ConsumableSupply, "id" | "schoolId" | "createdBy" | "status" | "createdAt" | "updatedAt"> & { id?: string }) => ConsumableSupply;
  stockIn: (supplyId: string, quantity: number, date: string, reference: string) => void;
  stockOut: (supplyId: string, quantity: number, date: string, recipient: string, purpose: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  findPropertyByQr: (code: string) => PropertyRecord | undefined;
  schoolProperties: PropertyRecord[];
  schoolSupplies: ConsumableSupply[];
  schoolUsers: Profile[];
  unreadNotifications: AppNotification[];
  can: (action: ActionKey) => boolean;
};

export type ActionKey =
  | "encode"
  | "assign"
  | "transfer"
  | "verify"
  | "supplies"
  | "audit"
  | "users"
  | "school_info";

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}

export function useOptionalApp() {
  return useContext(AppContext);
}

export const CLASSIFICATIONS: { value: PropertyClassification; label: string }[] = [
  { value: "low_value", label: "Low-Value" },
  { value: "high_value", label: "High-Value" },
];

export const CONDITIONS: { value: PropertyCondition; label: string }[] = [
  { value: "serviceable", label: "Serviceable" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "damaged", label: "Damaged" },
  { value: "unserviceable", label: "Unserviceable" },
  { value: "missing", label: "Missing" },
];

export const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "idle", label: "Idle" },
  { value: "unserviceable", label: "Unserviceable" },
  { value: "for_disposal", label: "For Disposal" },
  { value: "lost", label: "Lost" },
];
