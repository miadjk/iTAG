export type Role = "school_head" | "property_custodian";

export type PropertyClassification = "low_value" | "high_value";

export type PropertyCondition =
  | "serviceable"
  | "needs_repair"
  | "damaged"
  | "unserviceable"
  | "missing";

export type PropertyStatus =
  | "active"
  | "idle"
  | "unserviceable"
  | "for_disposal"
  | "lost";

export type SupplyStatus = "available" | "low_stock" | "out_of_stock";

export type NotificationType =
  | "property_registered"
  | "assignment"
  | "transfer"
  | "verification"
  | "low_stock"
  | "account"
  | "system";

export interface Region {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  regionId: string;
  name: string;
}

export interface Municipality {
  id: string;
  provinceId: string;
  name: string;
}

export interface District {
  id: string;
  municipalityId: string;
  name: string;
}

export interface School {
  id: string;
  districtId: string;
  name: string;
}

export interface Profile {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username?: string;
  passwordHash: string;
  role: Role;
  schoolId: string | null;
  schoolName?: string;
  regionId: string | null;
  provinceId: string | null;
  municipalityId: string | null;
  districtId: string | null;
  active: boolean;
  mustUpdateCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyRecord {
  id: string;
  schoolId: string;
  createdBy: string;
  classification: PropertyClassification;
  entityName: string;
  fundCluster: string;
  icsNumber: string;
  inventoryItemNumber: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  dateAcquired: string;
  acquisitionReference: string;
  unitCost: number;
  totalCost: number;
  fundSource: string;
  custodianLastUser: string;
  currentAccountablePerson: string;
  officeDepartment: string;
  location: string;
  estimatedUsefulLife: string;
  condition: PropertyCondition;
  status: PropertyStatus;
  remarks: string;
  brand: string;
  model: string;
  serialNumber: string;
  warranty: string;
  qrCode: string;
  excelGeneratedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = "pending" | "active" | "completed";

export interface PropertyAssignment {
  id: string;
  propertyId: string;
  accountablePerson: string;
  assignedUserId?: string;
  officeDepartment: string;
  location: string;
  dateAssigned: string;
  deadline?: string;
  status: AssignmentStatus;
  assignedBy: string;
  createdAt: string;
}

export interface PropertyTransfer {
  id: string;
  propertyId: string;
  previousAccountablePerson: string;
  newAccountablePerson: string;
  previousOffice: string;
  newOffice: string;
  previousLocation: string;
  newLocation: string;
  date: string;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface PropertyHistoryEntry {
  id: string;
  propertyId: string;
  action: string;
  summary: string;
  previousValue?: string;
  newValue?: string;
  userId: string;
  createdAt: string;
}

export interface ConsumableSupply {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  unit: string;
  currentQuantity: number;
  minimumStockLevel: number;
  location: string;
  status: SupplyStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  supplyId: string;
  type: "in" | "out";
  quantity: number;
  date: string;
  reference: string;
  recipient?: string;
  purpose?: string;
  performedBy: string;
  createdAt: string;
}

export interface InventoryVerification {
  id: string;
  propertyId: string;
  verifiedBy: string;
  date: string;
  location: string;
  accountablePerson: string;
  condition: PropertyCondition;
  status: PropertyStatus;
  existenceConfirmed: boolean;
  verificationStatus: "verified" | "discrepancy";
  remarks: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  href?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface GeneratedForm {
  id: string;
  propertyId: string;
  createdAt: string;
}

export interface AppState {
  profiles: Profile[];
  properties: PropertyRecord[];
  assignments: PropertyAssignment[];
  transfers: PropertyTransfer[];
  propertyHistory: PropertyHistoryEntry[];
  supplies: ConsumableSupply[];
  stockTransactions: StockTransaction[];
  verifications: InventoryVerification[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  generatedForms: GeneratedForm[];
  sessionUserId: string | null;
}

export const INITIAL_ADMIN_USERNAME = "iTAGPROPAdmin";
export const INITIAL_ADMIN_PASSWORD = "iTAGPROPAdmin2026";
