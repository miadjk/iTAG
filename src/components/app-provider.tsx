"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppContext,
  type ActionKey,
  type PropertyInput,
  type RegisterInput,
} from "@/lib/app-context";
import { emptyState, loadSchoolState, requireSchool } from "@/lib/data";
import { mapProperty, mapSupply, propertyInsert } from "@/lib/mappers";
import { encodedQrFieldsChanged } from "@/lib/qr";
import { normalizeTypeFields, validateTypeFields } from "@/lib/property-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase";
import { throwIfError } from "@/lib/site";
import { deriveSupplyStatus, isNineDigitPassword, manilaDateOnly, normalizeKey, uid } from "@/lib/utils";
import type { AppState, ConsumableSupply, Profile, PropertyRecord } from "@/types";
import { ToastHost, type ToastItem } from "@/components/ui/toast";

function toastId() {
  return uid("toast");
}

async function allocatePermanentId(client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>) {
  const rpc = await client.rpc("allocate_permanent_property_id");
  if (!rpc.error && rpc.data) {
    const value = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  // Fallback if SQL patch is not applied yet: client-side year sequence.
  const year = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", year: "numeric" });
  const prefix = `PROP-${year}-`;
  const existing = await client.from("properties").select("permanent_id").like("permanent_id", `${prefix}%`);
  let max = 0;
  for (const row of existing.data ?? []) {
    const raw = String((row as { permanent_id?: string }).permanent_id || "");
    const n = Number(raw.replace(prefix, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function ensurePermanentId(
  client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  property: { id: string; permanentId?: string },
) {
  if (property.permanentId?.trim()) return property.permanentId.trim();
  const permanentId = await allocatePermanentId(client);
  const updated = await client.from("properties").update({ permanent_id: permanentId }).eq("id", property.id);
  if (updated.error && /permanent_id/i.test(updated.error.message || "")) {
    // Column missing — SQL patch not applied; keep going without permanent id.
    return "";
  }
  throwIfError(updated.error, "Unable to assign permanent Property ID.");
  return permanentId;
}

async function bumpQrVersionIfEncodedChanged(
  client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  propertyId: string,
  before: Parameters<typeof encodedQrFieldsChanged>[0],
  after: Parameters<typeof encodedQrFieldsChanged>[0],
  previousVersion: number,
) {
  if (!encodedQrFieldsChanged(before, after)) return previousVersion || 1;
  const nextVersion = (previousVersion || 1) + 1;
  const updated = await client
    .from("properties")
    .update({ qr_version: nextVersion })
    .eq("id", propertyId);
  if (updated.error && /qr_version/i.test(updated.error.message || "")) {
    return previousVersion || 1;
  }
  throwIfError(updated.error, "Unable to update QR version.");
  return nextVersion;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => (configured ? createSupabaseBrowserClient() : null), [configured]);
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = toastId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setState(emptyState);
      setReady(true);
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setState(emptyState);
      setReady(true);
      return;
    }
    const next = await loadSchoolState(supabase, data.user.id);
    setState(next);
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, refresh]);

  const user = useMemo(
    () => state.profiles.find((p) => p.id === state.sessionUserId && p.active) ?? null,
    [state],
  );

  const schoolUsers = useMemo(() => {
    if (!user) return [];
    if (!user.schoolId) return state.profiles.filter((p) => p.id === user.id);
    return state.profiles.filter((p) => p.schoolId === user.schoolId);
  }, [state, user]);

  const schoolProperties = useMemo(() => {
    if (!user?.schoolId) return [];
    return state.properties.filter((p) => p.schoolId === user.schoolId);
  }, [state, user]);

  const schoolSupplies = useMemo(() => {
    if (!user?.schoolId) return [];
    return state.supplies.filter((s) => s.schoolId === user.schoolId);
  }, [state, user]);

  const unreadNotifications = useMemo(() => {
    if (!user) return [];
    return state.notifications.filter((n) => n.userId === user.id && !n.read);
  }, [state, user]);

  const can = useCallback(
    (action: ActionKey) => {
      if (!user) return false;
      if (user.role === "school_head") return ["audit", "users", "school_info", "assign"].includes(action);
      return ["encode", "assign", "transfer", "verify", "supplies"].includes(action);
    },
    [user],
  );

  async function requireClient() {
    if (!supabase) throw new Error("Supabase is not configured on this deployment.");
    return supabase;
  }

  async function notifySchool(input: { type: string; title: string; body: string; href?: string; userIds?: string[] }) {
    const client = await requireClient();
    if (!user?.schoolId) return;
    const targets = input.userIds ?? schoolUsers.filter((p) => p.active).map((p) => p.id);
    if (!targets.length) return;
    await client.from("notifications").insert(
      targets.map((userId) => ({
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
      })),
    );
  }

  async function writeAudit(action: string, recordType: string, recordId: string, previousValue?: string, newValue?: string) {
    const client = await requireClient();
    if (!user) return;
    await client.from("audit_logs").insert({
      user_id: user.id,
      action,
      record_type: recordType,
      record_id: recordId,
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
    });
  }

  async function writeHistory(propertyId: string, action: string, summary: string, previousValue?: string, newValue?: string) {
    const client = await requireClient();
    if (!user) return;
    await client.from("property_history").insert({
      property_id: propertyId,
      action,
      summary,
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
      user_id: user.id,
    });
  }

  const login = async (identifier: string, password: string) => {
    const client = await requireClient();
    const email = identifier.trim();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const message = (error?.message || "").toLowerCase();
      if (message.includes("confirm")) {
        throw new Error("This email is not confirmed yet. Register again with the same email to restore the account, then sign in.");
      }
      if (message.includes("rate")) {
        throw new Error("Too many sign-in attempts. Wait a minute and try again.");
      }
      throw new Error("Invalid email or password.");
    }
    const profile = await client.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!profile.data) {
      await client.auth.signOut();
      throw new Error("This account was removed. Register again with the same email to restore it, then sign in.");
    }
    if (!profile.data.active) {
      await client.auth.signOut();
      throw new Error("This account is inactive.");
    }
    await client.from("audit_logs").insert({
      user_id: data.user.id,
      action: "Login",
      record_type: "session",
      record_id: data.user.id,
    });
    await refresh();
    pushToast({ title: "Signed in", body: `Welcome back.`, tone: "success" });
  };

  const logout = async () => {
    const client = await requireClient();
    if (user) await writeAudit("Logout", "session", user.id);
    await client.auth.signOut();
    setState(emptyState);
  };

  const register = async (input: RegisterInput) => {
    if (!isNineDigitPassword(input.password)) throw new Error("Password must be exactly 9 digits.");
    const res = await fetch("/api/register/custodian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to register.");
    pushToast({ title: "Account created", body: "You can now sign in with your DepEd email.", tone: "success" });
  };

  const updateProfile = async (input: Partial<Profile> & { password?: string }) => {
    const client = await requireClient();
    if (!user) throw new Error("Not authorized.");
    if (input.password && !isNineDigitPassword(input.password)) {
      throw new Error("Password must be exactly 9 digits.");
    }
    const patch = {
      first_name: input.firstName ?? user.firstName,
      middle_name: input.middleName ?? user.middleName,
      last_name: input.lastName ?? user.lastName,
      email: input.email ?? user.email,
      school_id: input.schoolId ?? user.schoolId,
      region_id: input.regionId ?? user.regionId,
      province_id: input.provinceId ?? user.provinceId,
      municipality_id: input.municipalityId ?? user.municipalityId,
      district_id: input.districtId ?? user.districtId,
      must_update_credentials: false,
    };
    const updated = await client.from("profiles").update(patch).eq("id", user.id);
    throwIfError(updated.error, "Unable to update profile.");
    if (input.password) {
      const authUpdate = await client.auth.updateUser({ password: input.password });
      if (authUpdate.error) throw new Error(authUpdate.error.message);
    }
    if (input.email && input.email !== user.email) {
      const res = await fetch("/api/admin/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to update email.");
    }
    await writeAudit("Profile updated", "profile", user.id);
    await refresh();
    pushToast({ title: "Profile saved", body: "Account information was updated.", tone: "success" });
  };

  async function adminUser(action: "createCustodian" | "replaceSchoolHead" | "setActive", payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to save account.");
  }

  const replaceSchoolHead = async (input: RegisterInput) => {
    if (!can("users")) throw new Error("Not authorized.");
    await adminUser("replaceSchoolHead", input);
    await refresh();
    pushToast({ title: "School Head replaced", body: "Inventory and history remain with the school.", tone: "success" });
  };

  const createCustodian = async (input: RegisterInput) => {
    if (!can("users")) throw new Error("Not authorized.");
    await adminUser("createCustodian", { ...input, role: "property_custodian" });
    await refresh();
    pushToast({ title: "Custodian added", body: "The new account can sign in now.", tone: "success" });
  };

  const setCustodianActive = async (userId: string, active: boolean) => {
    if (!can("users")) throw new Error("Not authorized.");
    await adminUser("setActive", { userId, active });
    await refresh();
  };

  function assertUniqueItem(itemNo: string, ignoreId?: string) {
    const key = itemNo.trim().toLowerCase();
    const clash = schoolProperties.find(
      (p) => p.inventoryItemNumber.trim().toLowerCase() === key && p.id !== ignoreId,
    );
    if (clash) throw new Error(`Item No. ${itemNo.trim()} already exists in this school.`);
  }

  const encodeProperties = async (inputs: PropertyInput[]) => {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Only the Property Custodian encodes properties.");
    const schoolId = requireSchool(user);
    if (!inputs.length) throw new Error("Add at least one item.");
    const seen = new Set<string>();
    for (const input of inputs) {
      const item = input.inventoryItemNumber.trim();
      if (!item) throw new Error("Each item needs an Item No.");
      if (seen.has(item.toLowerCase())) throw new Error(`Duplicate Item No. in this form: ${item}`);
      seen.add(item.toLowerCase());
      assertUniqueItem(item);
      const typeErrors = validateTypeFields(input.classification, input.type || "", input.code || "");
      if (typeErrors.type || typeErrors.code) {
        throw new Error(typeErrors.type || typeErrors.code || "Invalid type/code for classification.");
      }
    }
    const created: PropertyRecord[] = [];
    for (const input of inputs) {
      const totalCost = input.totalCost ?? input.unitCost * input.quantity;
      const typeFields = normalizeTypeFields(input.classification, input.type || "", input.code || "");
      const insert = await client
        .from("properties")
        .insert(
          propertyInsert({
            schoolId,
            createdBy: user.id,
            classification: input.classification,
            type: typeFields.type,
            code: typeFields.code,
            entityName: input.entityName,
            fundCluster: input.fundCluster,
            icsNumber: input.icsNumber,
            inventoryItemNumber: input.inventoryItemNumber,
            description: input.description,
            quantity: input.quantity,
            unitOfMeasure: input.unitOfMeasure,
            dateAcquired: input.dateAcquired,
            acquisitionReference: input.acquisitionReference,
            unitCost: input.unitCost,
            totalCost,
            fundSource: input.fundSource,
            custodianLastUser: input.custodianLastUser,
            currentAccountablePerson: input.currentAccountablePerson || input.custodianLastUser,
            officeDepartment: input.officeDepartment,
            location: input.location,
            estimatedUsefulLife: input.estimatedUsefulLife,
            receivedFromName: input.receivedFromName || "",
            receivedFromPosition: input.receivedFromPosition || "",
            receivedByName: input.receivedByName || "",
            receivedByPosition: input.receivedByPosition || "",
            condition: input.condition,
            status: input.status,
            remarks: input.remarks,
            brand: input.brand,
            model: input.model,
            serialNumber: input.serialNumber,
            warranty: input.warranty,
          }),
        )
        .select("*")
        .single();
      throwIfError(insert.error, "Unable to save property.");
      const saved = mapProperty(insert.data);
      let permanentId = saved.permanentId;
      let qrVersion = saved.qrVersion || 1;
      if (!permanentId) {
        permanentId = await allocatePermanentId(client);
        const idUpdate = await client
          .from("properties")
          .update({ permanent_id: permanentId, qr_version: 1 })
          .eq("id", saved.id)
          .select("*")
          .single();
        if (!idUpdate.error && idUpdate.data) {
          created.push(mapProperty(idUpdate.data));
        } else {
          created.push({ ...saved, permanentId, qrVersion: 1 });
        }
        qrVersion = 1;
      } else {
        created.push(saved);
      }
      await writeHistory(
        saved.id,
        "created",
        `Property encoded. Permanent ID ${permanentId || saved.inventoryItemNumber}. QR version ${qrVersion} (CURRENT).`,
      );
      await writeAudit("Property created", "property", saved.id);
    }
    await notifySchool({
      type: "property_registered",
      title: created.length > 1 ? "Properties registered" : "Property registered",
      body: created.length > 1 ? `${created.length} items saved under ICSNO. ${inputs[0].icsNumber}.` : `${inputs[0].inventoryItemNumber} saved.`,
      href: `/properties/group/${encodeURIComponent(inputs[0].icsNumber.trim())}`,
    });
    await refresh();
    pushToast({
      title: created.length > 1 ? "Properties saved" : "Property saved",
      body: "Self-contained offline QR codes were generated for each item.",
      tone: "success",
    });
    return created;
  };

  const encodeProperty = async (input: PropertyInput) => {
    const [record] = await encodeProperties([input]);
    return record;
  };

  const updateProperty = async (id: string, input: PropertyInput) => {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Only the Property Custodian can edit properties.");
    const current = schoolProperties.find((p) => p.id === id);
    if (!current) throw new Error("Property not found.");
    assertUniqueItem(input.inventoryItemNumber, id);
    const typeErrors = validateTypeFields(input.classification, input.type || "", input.code || "");
    if (typeErrors.type || typeErrors.code) {
      throw new Error(typeErrors.type || typeErrors.code || "Invalid type/code for classification.");
    }
    const totalCost = input.totalCost ?? input.unitCost * input.quantity;
    const typeFields = normalizeTypeFields(input.classification, input.type || "", input.code || "");
    const afterSnapshot = {
      description: input.description,
      classification: input.classification,
      type: typeFields.type,
      code: typeFields.code,
      inventoryItemNumber: input.inventoryItemNumber,
      icsNumber: input.icsNumber,
      unitCost: input.unitCost,
      totalCost,
      fundSource: input.fundSource,
      location: input.location,
      currentAccountablePerson: input.currentAccountablePerson || input.custodianLastUser,
      custodianLastUser: input.custodianLastUser,
      status: input.status,
      dateAcquired: input.dateAcquired,
      quantity: input.quantity,
      unitOfMeasure: input.unitOfMeasure,
    };
    const updated = await client
      .from("properties")
      .update({
        ...propertyInsert({
          schoolId: current.schoolId,
          createdBy: current.createdBy,
          classification: input.classification,
          type: typeFields.type,
          code: typeFields.code,
          entityName: input.entityName,
          fundCluster: input.fundCluster,
          icsNumber: input.icsNumber,
          inventoryItemNumber: input.inventoryItemNumber,
          description: input.description,
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          dateAcquired: input.dateAcquired,
          acquisitionReference: input.acquisitionReference,
          unitCost: input.unitCost,
          totalCost,
          fundSource: input.fundSource,
          custodianLastUser: input.custodianLastUser,
          currentAccountablePerson: input.currentAccountablePerson || input.custodianLastUser,
          officeDepartment: input.officeDepartment,
          location: input.location,
          estimatedUsefulLife: input.estimatedUsefulLife,
          receivedFromName: input.receivedFromName || "",
          receivedFromPosition: input.receivedFromPosition || "",
          receivedByName: input.receivedByName || "",
          receivedByPosition: input.receivedByPosition || "",
          condition: input.condition,
          status: input.status,
          remarks: input.remarks,
          brand: input.brand,
          model: input.model,
          serialNumber: input.serialNumber,
          warranty: input.warranty,
        }),
        created_by: current.createdBy,
        school_id: current.schoolId,
      })
      .eq("id", id);
    throwIfError(updated.error, "Unable to update property.");
    await ensurePermanentId(client, current);
    const nextVersion = await bumpQrVersionIfEncodedChanged(client, id, current, afterSnapshot, current.qrVersion || 1);
    if (nextVersion !== (current.qrVersion || 1)) {
      await writeHistory(
        id,
        "qr_regenerated",
        `QR version ${current.qrVersion || 1} marked OUTDATED. QR version ${nextVersion} is now CURRENT.`,
        String(current.qrVersion || 1),
        String(nextVersion),
      );
    }
    await writeHistory(id, "updated", "Property record updated.");
    await writeAudit("Property updated", "property", id);
    await refresh();
    pushToast({
      title: "Property updated",
      body:
        nextVersion !== (current.qrVersion || 1)
          ? `Saved. Current QR is now version ${nextVersion} — reprint the label.`
          : "The existing record was saved.",
      tone: "success",
    });
  };

  const deleteProperty = async (id: string) => {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const current = schoolProperties.find((p) => p.id === id);
    if (!current) throw new Error("Property not found.");
    const removed = await client.from("properties").delete().eq("id", id);
    throwIfError(removed.error, "Unable to delete property.");
    await writeAudit("Property deleted", "property", id, current.inventoryItemNumber);
    await refresh();
    pushToast({ title: "Property removed", body: `${current.inventoryItemNumber} was deleted.`, tone: "success" });
  };

  const saveReport = async (reportType: string) => {
    const client = await requireClient();
    if (!user) throw new Error("Not authorized.");
    const schoolId = requireSchool(user);
    const inserted = await client.from("generated_reports").insert({
      school_id: schoolId,
      created_by: user.id,
      report_type: reportType,
      payload: { count: schoolProperties.length },
    });
    throwIfError(inserted.error, "Unable to save report.");
    await writeAudit("Report generated", "report", reportType);
    await refresh();
    pushToast({ title: "Report saved", body: `${reportType} record was saved.`, tone: "success" });
  };

  const assignProperty = async (input: {
    propertyId: string;
    accountablePerson: string;
    assignedUserId?: string;
    officeDepartment: string;
    location: string;
    status?: "pending" | "active" | "completed";
  }) => {
    const client = await requireClient();
    if (!user || !can("assign")) throw new Error("Not authorized.");
    const current = schoolProperties.find((p) => p.id === input.propertyId);
    if (!current) throw new Error("Property not found.");
    const assignedUser = input.assignedUserId ? schoolUsers.find((p) => p.id === input.assignedUserId) : undefined;
    const accountablePerson = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : input.accountablePerson.trim();
    if (!accountablePerson) throw new Error("Accountable person is required.");
    const assignedAt = manilaDateOnly();
    const inserted = await client.from("property_assignments").insert({
      property_id: input.propertyId,
      accountable_person: accountablePerson,
      assigned_user_id: input.assignedUserId || null,
      office_department: input.officeDepartment,
      location: input.location,
      date_assigned: assignedAt,
      deadline: null,
      status: input.status ?? "active",
      assigned_by: user.id,
    });
    throwIfError(inserted.error, "Unable to save assignment.");
    const updated = await client
      .from("properties")
      .update({
        current_accountable_person: accountablePerson,
        office_department: input.officeDepartment,
        location: input.location,
        custodian_last_user: accountablePerson,
        status: "active",
      })
      .eq("id", input.propertyId);
    throwIfError(updated.error, "Unable to update property.");
    await ensurePermanentId(client, current);
    const afterAssign = {
      ...current,
      currentAccountablePerson: accountablePerson,
      custodianLastUser: accountablePerson,
      location: input.location,
      officeDepartment: input.officeDepartment,
      status: "active" as const,
    };
    const nextVersion = await bumpQrVersionIfEncodedChanged(client, input.propertyId, current, afterAssign, current.qrVersion || 1);
    await writeHistory(input.propertyId, "assigned", `Assigned to ${accountablePerson}`, current.currentAccountablePerson, accountablePerson);
    if (nextVersion !== (current.qrVersion || 1)) {
      await writeHistory(
        input.propertyId,
        "qr_regenerated",
        `QR version ${current.qrVersion || 1} marked OUTDATED. QR version ${nextVersion} is now CURRENT after assignment.`,
        String(current.qrVersion || 1),
        String(nextVersion),
      );
    }
    await writeAudit("Property assigned", "property", input.propertyId, current.currentAccountablePerson, accountablePerson);
    await notifySchool({
      type: "assignment",
      title: "Property assigned",
      body: `${current.inventoryItemNumber} assigned to ${accountablePerson}.`,
      href: "/assignments",
      userIds: schoolUsers
        .filter((p) => p.role === "school_head" || p.id === input.assignedUserId || p.id === user.id)
        .map((p) => p.id),
    });
    await refresh();
    pushToast({
      title: "Assignment saved",
      body:
        nextVersion !== (current.qrVersion || 1)
          ? `Assigned. Current QR is now version ${nextVersion} — reprint the label.`
          : "The assigned user can see this on their dashboard.",
      tone: "success",
    });
  };

  const transferProperty = async (input: {
    propertyId: string;
    newAccountablePerson: string;
    newOffice: string;
    newLocation: string;
    reason: string;
  }) => {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const current = schoolProperties.find((p) => p.id === input.propertyId);
    if (!current) throw new Error("Property not found.");
    if (!input.newAccountablePerson.trim() || !input.reason.trim()) {
      throw new Error("New accountable person and reason are required.");
    }
    const transferredAt = manilaDateOnly();
    const inserted = await client.from("property_transfers").insert({
      property_id: input.propertyId,
      previous_accountable_person: current.currentAccountablePerson,
      new_accountable_person: input.newAccountablePerson.trim(),
      previous_office: current.officeDepartment,
      new_office: input.newOffice,
      previous_location: current.location,
      new_location: input.newLocation,
      date: transferredAt,
      reason: input.reason.trim(),
      performed_by: user.id,
    });
    throwIfError(inserted.error, "Unable to save transfer.");
    const updated = await client
      .from("properties")
      .update({
        current_accountable_person: input.newAccountablePerson.trim(),
        office_department: input.newOffice,
        location: input.newLocation,
        custodian_last_user: input.newAccountablePerson.trim(),
        status: "active",
      })
      .eq("id", input.propertyId);
    throwIfError(updated.error, "Unable to update property.");
    await ensurePermanentId(client, current);
    const afterTransfer = {
      ...current,
      currentAccountablePerson: input.newAccountablePerson.trim(),
      custodianLastUser: input.newAccountablePerson.trim(),
      location: input.newLocation,
      officeDepartment: input.newOffice,
      status: "active" as const,
    };
    const nextVersion = await bumpQrVersionIfEncodedChanged(
      client,
      input.propertyId,
      current,
      afterTransfer,
      current.qrVersion || 1,
    );
    await writeHistory(
      input.propertyId,
      "transferred",
      `Transferred from ${current.currentAccountablePerson} to ${input.newAccountablePerson}`,
      current.currentAccountablePerson,
      input.newAccountablePerson,
    );
    if (nextVersion !== (current.qrVersion || 1)) {
      await writeHistory(
        input.propertyId,
        "qr_regenerated",
        `QR version ${current.qrVersion || 1} marked OUTDATED. QR version ${nextVersion} is now CURRENT after transfer.`,
        String(current.qrVersion || 1),
        String(nextVersion),
      );
    }
    await writeAudit("Property transferred", "property", input.propertyId);
    await notifySchool({
      type: "transfer",
      title: "Property transferred",
      body: `${current.inventoryItemNumber} is now with ${input.newAccountablePerson}.`,
      href: `/properties/${input.propertyId}`,
    });
    await refresh();
    pushToast({
      title: "Transfer confirmed",
      body:
        nextVersion !== (current.qrVersion || 1)
          ? `Transferred. Current QR is now version ${nextVersion} — reprint the label.`
          : "Current information updated. Previous assignment kept in history.",
      tone: "success",
    });
  };

  const verifyProperty = async (input: {
    propertyId: string;
    location: string;
    accountablePerson: string;
    condition: PropertyRecord["condition"];
    status: PropertyRecord["status"];
    existenceConfirmed: boolean;
    remarks: string;
  }) => {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const current = schoolProperties.find((p) => p.id === input.propertyId);
    if (!current) throw new Error("Property not found.");
    const verificationStatus = input.existenceConfirmed ? "verified" : "discrepancy";
    const inserted = await client.from("inventory_verifications").insert({
      property_id: input.propertyId,
      verified_by: user.id,
      date: new Date().toISOString().slice(0, 10),
      location: input.location,
      accountable_person: input.accountablePerson,
      condition: input.condition,
      status: input.status,
      existence_confirmed: input.existenceConfirmed,
      verification_status: verificationStatus,
      remarks: input.remarks,
    });
    throwIfError(inserted.error, "Unable to save verification.");
    const updated = await client
      .from("properties")
      .update({
        location: input.location,
        current_accountable_person: input.accountablePerson,
        condition: input.condition,
        status: input.status,
        remarks: input.remarks || current.remarks,
      })
      .eq("id", input.propertyId);
    throwIfError(updated.error, "Unable to update property.");
    await writeHistory(input.propertyId, "verified", `Inventory verification ${verificationStatus}`);
    await writeAudit("Inventory verification", "property", input.propertyId);
    await notifySchool({
      type: "verification",
      title: "Inventory verification recorded",
      body: `${current.inventoryItemNumber} marked ${verificationStatus}.`,
      href: `/properties/${input.propertyId}`,
    });
    await refresh();
    pushToast({ title: "Verification saved", body: "Physical check recorded in history and audit trail.", tone: "success" });
  };

  const upsertSupply = async (
    input: Omit<ConsumableSupply, "id" | "schoolId" | "createdBy" | "status" | "createdAt" | "updatedAt"> & { id?: string },
  ) => {
    const client = await requireClient();
    if (!user?.schoolId || user.role !== "property_custodian") throw new Error("Not authorized.");
    const name = normalizeKey(input.name);
    const unit = normalizeKey(input.unit);
    const classification = input.classification || "consumable";
    const type = normalizeKey(input.type || "");
    const code = normalizeKey(input.code || "");
    if (!name) throw new Error("Supply name is required.");

    let targetId = input.id;
    if (!targetId) {
      const match = schoolSupplies.find(
        (s) =>
          normalizeKey(s.name).toLowerCase() === name.toLowerCase() &&
          normalizeKey(s.unit).toLowerCase() === unit.toLowerCase() &&
          (s.classification || "consumable") === classification &&
          normalizeKey(s.type || "").toLowerCase() === type.toLowerCase() &&
          normalizeKey(s.code || "").toLowerCase() === code.toLowerCase(),
      );
      if (match) targetId = match.id;
    }

    const existing = targetId ? schoolSupplies.find((s) => s.id === targetId) : undefined;
    const openingQty = Math.max(0, Number(input.currentQuantity) || 0);
    // Matching existing supply: keep current quantity (use Stock-in for additions). New supply starts at 0 then records opening stock.
    const quantityForRow = existing ? existing.currentQuantity : 0;
    const status = deriveSupplyStatus(existing ? existing.currentQuantity : openingQty, input.minimumStockLevel);
    const row = {
      school_id: user.schoolId,
      name,
      description: input.description,
      unit,
      current_quantity: quantityForRow,
      minimum_stock_level: input.minimumStockLevel,
      location: input.location,
      remarks: input.remarks,
      classification,
      type,
      code,
      status: existing ? deriveSupplyStatus(existing.currentQuantity, input.minimumStockLevel) : deriveSupplyStatus(0, input.minimumStockLevel),
      created_by: existing?.createdBy || user.id,
    };

    const res = targetId
      ? await client.from("consumable_supplies").update(row).eq("id", targetId).select("*").single()
      : await client.from("consumable_supplies").insert(row).select("*").single();
    throwIfError(res.error, "Unable to save supply.");
    const savedId = String(res.data.id);

    if (!existing && openingQty > 0) {
      const movement = await client.rpc("apply_stock_movement", {
        p_supply_id: savedId,
        p_type: "in",
        p_quantity: openingQty,
        p_date: new Date().toISOString().slice(0, 10),
        p_received_by: "",
        p_position: "",
        p_remarks: "Opening stock",
        p_reference: "Opening stock",
      });
      if (movement.error) {
        // Fallback if RPC patch is not applied yet: set quantity and write history row.
        const fallbackStatus = deriveSupplyStatus(openingQty, input.minimumStockLevel);
        const updated = await client
          .from("consumable_supplies")
          .update({ current_quantity: openingQty, status: fallbackStatus })
          .eq("id", savedId);
        throwIfError(updated.error, "Unable to set opening stock.");
        const tx = await client.from("stock_transactions").insert({
          supply_id: savedId,
          type: "in",
          quantity: openingQty,
          previous_quantity: 0,
          new_quantity: openingQty,
          date: new Date().toISOString().slice(0, 10),
          reference: "Opening stock",
          purpose: "Opening stock",
          received_by: "",
          position: "",
          performed_by: user.id,
        });
        throwIfError(tx.error, "Unable to record opening stock history.");
      }
    }

    await writeAudit(existing || input.id ? "Supply updated" : "Supply created", "supply", savedId);
    if (status !== "available") {
      await notifySchool({
        type: "low_stock",
        title: status === "out_of_stock" ? "Supply out of stock" : "Low-stock notification",
        body: `${name} is at ${existing ? existing.currentQuantity : openingQty} ${unit}.`,
        href: "/supplies",
      });
    }
    await refresh();
    if (existing && !input.id) {
      pushToast({
        title: "Existing supply updated",
        body: "Matched by name, unit, classification, type, and code. Use Stock-in to add quantity.",
        tone: "success",
      });
    }
    const mapped = mapSupply(res.data);
    return schoolSupplies.find((s) => s.id === savedId) ?? {
      ...mapped,
      currentQuantity: existing ? existing.currentQuantity : openingQty,
      status,
      classification,
      type,
      code,
    };
  };

  async function applyStockMovement(input: {
    supplyId: string;
    type: "in" | "out";
    quantity: number;
    date: string;
    receivedBy: string;
    position: string;
    remarks: string;
    reference?: string;
  }) {
    const client = await requireClient();
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    if (input.quantity <= 0) throw new Error("Enter a valid quantity.");

    const movement = await client.rpc("apply_stock_movement", {
      p_supply_id: input.supplyId,
      p_type: input.type,
      p_quantity: input.quantity,
      p_date: input.date || null,
      p_received_by: input.receivedBy.trim(),
      p_position: input.position.trim(),
      p_remarks: input.remarks.trim(),
      p_reference: (input.reference || input.remarks || "").trim(),
    });

    if (!movement.error) {
      const row = Array.isArray(movement.data) ? movement.data[0] : movement.data;
      const prev = Number(row?.previous_quantity ?? 0);
      const next = Number(row?.new_quantity ?? 0);
      const supply = schoolSupplies.find((s) => s.id === input.supplyId);
      await writeAudit(
        input.type === "in" ? "Stock-in" : "Stock-out",
        "supply",
        input.supplyId,
        String(prev),
        String(next),
      );
      if (input.type === "out" && row?.status && row.status !== "available" && supply) {
        await notifySchool({
          type: "low_stock",
          title: "Low-stock notification",
          body: `${supply.name} reached ${next} ${supply.unit}.`,
          href: "/supplies",
        });
      }
      await refresh();
      return;
    }

    // Fallback path with live DB quantity check (server-side read) if RPC is unavailable.
    const live = await client.from("consumable_supplies").select("*").eq("id", input.supplyId).single();
    throwIfError(live.error, "Supply not found.");
    const supply = mapSupply(live.data);
    const previous = supply.currentQuantity;
    if (input.type === "out" && input.quantity > previous) {
      throw new Error(`Insufficient stock. Available quantity: ${previous}.`);
    }
    const next = input.type === "in" ? previous + input.quantity : previous - input.quantity;
    const status = deriveSupplyStatus(next, supply.minimumStockLevel);
    const tx = await client.from("stock_transactions").insert({
      supply_id: input.supplyId,
      type: input.type,
      quantity: input.quantity,
      previous_quantity: previous,
      new_quantity: next,
      date: input.date || null,
      reference: (input.reference || input.remarks || "").trim(),
      recipient: input.receivedBy.trim() || null,
      purpose: input.remarks.trim() || null,
      received_by: input.receivedBy.trim(),
      position: input.position.trim(),
      performed_by: user.id,
    });
    throwIfError(tx.error, input.type === "in" ? "Unable to record stock-in." : "Unable to record stock-out.");
    const updated = await client
      .from("consumable_supplies")
      .update({ current_quantity: next, status })
      .eq("id", input.supplyId);
    throwIfError(updated.error, "Unable to update stock.");
    await writeAudit(input.type === "in" ? "Stock-in" : "Stock-out", "supply", input.supplyId, String(previous), String(next));
    if (input.type === "out" && status !== "available") {
      await notifySchool({
        type: "low_stock",
        title: "Low-stock notification",
        body: `${supply.name} reached ${next} ${supply.unit}.`,
        href: "/supplies",
      });
    }
    await refresh();
  }

  const stockIn = async (input: {
    supplyId: string;
    quantity: number;
    date: string;
    receivedBy: string;
    position: string;
    remarks: string;
    reference?: string;
  }) => {
    await applyStockMovement({ ...input, type: "in" });
    pushToast({ title: "Stock-in recorded", body: "Current quantity increased and history was saved.", tone: "success" });
  };

  const stockOut = async (input: {
    supplyId: string;
    quantity: number;
    date: string;
    receivedBy: string;
    position: string;
    remarks: string;
  }) => {
    await applyStockMovement({ ...input, type: "out" });
    pushToast({ title: "Stock-out recorded", body: "Remaining stock was updated.", tone: "success" });
  };

  const markNotificationRead = async (id: string) => {
    const client = await requireClient();
    await client.from("notifications").update({ read: true }).eq("id", id);
    await refresh();
  };

  const markAllNotificationsRead = async () => {
    const client = await requireClient();
    if (!user) return;
    await client.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    await refresh();
  };

  const findPropertyByQr = (code: string) => {
    const normalized = code.trim();
    return schoolProperties.find(
      (p) =>
        p.qrCode === normalized ||
        p.id === normalized ||
        p.inventoryItemNumber.toLowerCase() === normalized.toLowerCase(),
    );
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        Loading iTAG…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-center text-sm text-[var(--text-muted)]">
        Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue.
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        ready: true,
        state,
        user,
        login,
        logout,
        register,
        updateProfile,
        replaceSchoolHead,
        createCustodian,
        setCustodianActive,
        encodeProperty,
        encodeProperties,
        updateProperty,
        deleteProperty,
        saveReport,
        assignProperty,
        transferProperty,
        verifyProperty,
        upsertSupply,
        stockIn,
        stockOut,
        markNotificationRead,
        markAllNotificationsRead,
        findPropertyByQr,
        schoolProperties,
        schoolSupplies,
        schoolUsers,
        unreadNotifications,
        can,
      }}
    >
      {children}
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </AppContext.Provider>
  );
}
