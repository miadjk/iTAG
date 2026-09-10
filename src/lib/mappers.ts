import { getSchoolName } from "@/lib/locations";
import type {
  AppNotification,
  AuditLog,
  ConsumableSupply,
  InventoryVerification,
  Profile,
  PropertyAssignment,
  PropertyHistoryEntry,
  PropertyRecord,
  PropertyTransfer,
  StockTransaction,
} from "@/types";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapProfile(row: Row): Profile {
  return {
    id: str(row.id),
    firstName: str(row.first_name),
    middleName: str(row.middle_name),
    lastName: str(row.last_name),
    email: str(row.email),
    role: (row.role as Profile["role"]) || "property_custodian",
    schoolId: row.school_id ? str(row.school_id) : null,
    schoolName: getSchoolName(row.school_id ? str(row.school_id) : null),
    regionId: row.region_id ? str(row.region_id) : null,
    provinceId: row.province_id ? str(row.province_id) : null,
    municipalityId: row.municipality_id ? str(row.municipality_id) : null,
    districtId: row.district_id ? str(row.district_id) : null,
    active: Boolean(row.active),
    mustUpdateCredentials: Boolean(row.must_update_credentials),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapProperty(row: Row): PropertyRecord {
  const item = str(row.inventory_item_number);
  return {
    id: str(row.id),
    schoolId: str(row.school_id),
    createdBy: str(row.created_by),
    classification: (row.classification as PropertyRecord["classification"]) || "low_value",
    entityName: str(row.entity_name),
    fundCluster: str(row.fund_cluster),
    icsNumber: str(row.ics_number),
    inventoryItemNumber: item,
    propertyNumber: item,
    description: str(row.description),
    quantity: num(row.quantity, 1),
    unitOfMeasure: str(row.unit_of_measure, "Unit"),
    dateAcquired: str(row.date_acquired),
    acquisitionReference: str(row.acquisition_reference),
    unitCost: num(row.unit_cost),
    totalCost: num(row.total_cost),
    fundSource: str(row.fund_source),
    custodianLastUser: str(row.custodian_last_user),
    currentAccountablePerson: str(row.current_accountable_person),
    officeDepartment: str(row.office_department),
    location: str(row.location),
    estimatedUsefulLife: str(row.estimated_useful_life),
    condition: (row.condition as PropertyRecord["condition"]) || "serviceable",
    status: (row.status as PropertyRecord["status"]) || "idle",
    remarks: str(row.remarks),
    brand: str(row.brand),
    model: str(row.model),
    serialNumber: str(row.serial_number),
    warranty: str(row.warranty),
    qrCode: str(row.qr_code),
    excelGeneratedAt: str(row.excel_generated_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapAssignment(row: Row): PropertyAssignment {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    accountablePerson: str(row.accountable_person),
    assignedUserId: row.assigned_user_id ? str(row.assigned_user_id) : undefined,
    officeDepartment: str(row.office_department),
    location: str(row.location),
    dateAssigned: str(row.date_assigned),
    deadline: row.deadline ? str(row.deadline) : undefined,
    status: (row.status as PropertyAssignment["status"]) || "active",
    assignedBy: str(row.assigned_by),
    createdAt: str(row.created_at),
  };
}

export function mapTransfer(row: Row): PropertyTransfer {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    previousAccountablePerson: str(row.previous_accountable_person),
    newAccountablePerson: str(row.new_accountable_person),
    previousOffice: str(row.previous_office),
    newOffice: str(row.new_office),
    previousLocation: str(row.previous_location),
    newLocation: str(row.new_location),
    date: str(row.date),
    reason: str(row.reason),
    performedBy: str(row.performed_by),
    createdAt: str(row.created_at),
  };
}

export function mapHistory(row: Row): PropertyHistoryEntry {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    action: str(row.action),
    summary: str(row.summary),
    previousValue: row.previous_value ? str(row.previous_value) : undefined,
    newValue: row.new_value ? str(row.new_value) : undefined,
    userId: str(row.user_id),
    createdAt: str(row.created_at),
  };
}

export function mapSupply(row: Row): ConsumableSupply {
  return {
    id: str(row.id),
    schoolId: str(row.school_id),
    name: str(row.name),
    description: str(row.description),
    unit: str(row.unit),
    currentQuantity: num(row.current_quantity),
    minimumStockLevel: num(row.minimum_stock_level),
    location: str(row.location),
    status: (row.status as ConsumableSupply["status"]) || "available",
    remarks: str(row.remarks),
    createdBy: str(row.created_by),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapStock(row: Row): StockTransaction {
  return {
    id: str(row.id),
    supplyId: str(row.supply_id),
    type: row.type === "out" ? "out" : "in",
    quantity: num(row.quantity),
    date: str(row.date),
    reference: str(row.reference),
    recipient: row.recipient ? str(row.recipient) : undefined,
    purpose: row.purpose ? str(row.purpose) : undefined,
    performedBy: str(row.performed_by),
    createdAt: str(row.created_at),
  };
}

export function mapNotification(row: Row): AppNotification {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    type: (row.type as AppNotification["type"]) || "system",
    title: str(row.title),
    body: str(row.body),
    read: Boolean(row.read),
    href: row.href ? str(row.href) : undefined,
    createdAt: str(row.created_at),
  };
}

export function mapAudit(row: Row): AuditLog {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    action: str(row.action),
    recordType: str(row.record_type),
    recordId: str(row.record_id),
    previousValue: row.previous_value ? str(row.previous_value) : undefined,
    newValue: row.new_value ? str(row.new_value) : undefined,
    createdAt: str(row.created_at),
  };
}

export function mapVerification(row: Row): InventoryVerification {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    verifiedBy: str(row.verified_by),
    date: str(row.date),
    location: str(row.location),
    accountablePerson: str(row.accountable_person),
    condition: (row.condition as InventoryVerification["condition"]) || "serviceable",
    status: (row.status as InventoryVerification["status"]) || "idle",
    existenceConfirmed: Boolean(row.existence_confirmed),
    verificationStatus: row.verification_status === "discrepancy" ? "discrepancy" : "verified",
    remarks: str(row.remarks),
    createdAt: str(row.created_at),
  };
}

export function propertyInsert(input: {
  schoolId: string;
  createdBy: string;
  classification: string;
  entityName: string;
  fundCluster: string;
  icsNumber: string;
  inventoryItemNumber: string;
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
  condition: string;
  status: string;
  remarks: string;
  brand: string;
  model: string;
  serialNumber: string;
  warranty: string;
}) {
  return {
    school_id: input.schoolId,
    created_by: input.createdBy,
    classification: input.classification,
    entity_name: input.entityName,
    fund_cluster: input.fundCluster,
    ics_number: input.icsNumber.trim(),
    inventory_item_number: input.inventoryItemNumber.trim(),
    description: input.description.trim(),
    quantity: input.quantity,
    unit_of_measure: input.unitOfMeasure,
    date_acquired: input.dateAcquired || null,
    acquisition_reference: input.acquisitionReference,
    unit_cost: input.unitCost,
    total_cost: input.totalCost,
    fund_source: input.fundSource,
    custodian_last_user: input.custodianLastUser,
    current_accountable_person: input.currentAccountablePerson,
    office_department: input.officeDepartment,
    location: input.location,
    estimated_useful_life: input.estimatedUsefulLife,
    condition: input.condition,
    status: input.status,
    remarks: input.remarks,
    brand: input.brand,
    model: input.model,
    serial_number: input.serialNumber,
    warranty: input.warranty,
    excel_generated_at: new Date().toISOString(),
  };
}
