import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAssignment,
  mapAudit,
  mapHistory,
  mapNotification,
  mapProfile,
  mapProperty,
  mapStock,
  mapSupply,
  mapTransfer,
  mapVerification,
} from "@/lib/mappers";
import { throwIfError } from "@/lib/site";
import type { AppState, Profile } from "@/types";

export const emptyState: AppState = {
  profiles: [],
  properties: [],
  assignments: [],
  transfers: [],
  propertyHistory: [],
  supplies: [],
  stockTransactions: [],
  verifications: [],
  notifications: [],
  auditLogs: [],
  generatedForms: [],
  sessionUserId: null,
};

export async function loadSchoolState(client: SupabaseClient, userId: string): Promise<AppState> {
  const profileRes = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  throwIfError(profileRes.error, "Unable to load profile.");
  if (!profileRes.data) {
    return { ...emptyState, sessionUserId: userId };
  }

  const me = mapProfile(profileRes.data);
  const schoolId = me.schoolId;

  if (!schoolId) {
    return {
      ...emptyState,
      profiles: [me],
      sessionUserId: userId,
    };
  }

  const [profiles, properties, assignments, transfers, history, supplies, stock, notes, audits, verifications] =
    await Promise.all([
      client.from("profiles").select("*").eq("school_id", schoolId),
      client.from("properties").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      client.from("property_assignments").select("*").order("created_at", { ascending: false }),
      client.from("property_transfers").select("*").order("created_at", { ascending: false }),
      client.from("property_history").select("*").order("created_at", { ascending: false }),
      client.from("consumable_supplies").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      client.from("stock_transactions").select("*").order("created_at", { ascending: false }),
      client.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(400),
      client.from("inventory_verifications").select("*").order("created_at", { ascending: false }),
    ]);

  [
    profiles,
    properties,
    assignments,
    transfers,
    history,
    supplies,
    stock,
    notes,
    audits,
    verifications,
  ].forEach((res) => throwIfError(res.error, "Unable to load school records."));

  const propertyIds = new Set((properties.data ?? []).map((row) => String(row.id)));
  const supplyIds = new Set((supplies.data ?? []).map((row) => String(row.id)));
  const schoolUserIds = new Set((profiles.data ?? []).map((row) => String(row.id)));

  return {
    profiles: (profiles.data ?? []).map(mapProfile),
    properties: (properties.data ?? []).map(mapProperty),
    assignments: (assignments.data ?? []).map(mapAssignment).filter((row) => propertyIds.has(row.propertyId)),
    transfers: (transfers.data ?? []).map(mapTransfer).filter((row) => propertyIds.has(row.propertyId)),
    propertyHistory: (history.data ?? []).map(mapHistory).filter((row) => propertyIds.has(row.propertyId)),
    supplies: (supplies.data ?? []).map(mapSupply),
    stockTransactions: (stock.data ?? []).map(mapStock).filter((row) => supplyIds.has(row.supplyId)),
    verifications: (verifications.data ?? []).map(mapVerification).filter((row) => propertyIds.has(row.propertyId)),
    notifications: (notes.data ?? []).map(mapNotification),
    auditLogs: (audits.data ?? []).map(mapAudit).filter((row) => schoolUserIds.has(row.userId)),
    generatedForms: (properties.data ?? []).map((row) => ({
      id: String(row.id),
      propertyId: String(row.id),
      createdAt: String(row.excel_generated_at || row.created_at),
    })),
    sessionUserId: userId,
  };
}

export function requireSchool(user: Profile | null) {
  if (!user?.schoolId) throw new Error("Complete your school profile before using inventory.");
  return user.schoolId;
}
