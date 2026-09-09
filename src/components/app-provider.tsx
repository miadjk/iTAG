"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppContext,
  type ActionKey,
  type PropertyInput,
  type RegisterInput,
} from "@/lib/app-context";
import { createInitialState, deriveSupplyStatus, loadState, saveState } from "@/lib/store";
import { getSchoolName, locationFromSchool } from "@/lib/locations";
import { hashSecret, isNineDigitPassword, nowIso, uid } from "@/lib/utils";
import type {
  AppNotification,
  AppState,
  ConsumableSupply,
  Profile,
  PropertyRecord,
} from "@/types";
import { INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_USERNAME } from "@/types";
import { ToastHost, type ToastItem } from "@/components/ui/toast";

function notify(
  state: AppState,
  users: Profile[],
  payload: Omit<AppNotification, "id" | "userId" | "read" | "createdAt"> & { userIds?: string[] },
) {
  const createdAt = nowIso();
  const targets = payload.userIds ?? users.filter((u) => u.active).map((u) => u.id);
  const items: AppNotification[] = targets.map((userId) => ({
    id: uid("note"),
    userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    href: payload.href,
    read: false,
    createdAt,
  }));
  return { ...state, notifications: [...items, ...state.notifications] };
}

function audit(state: AppState, userId: string, action: string, recordType: string, recordId: string, previousValue?: string, newValue?: string): AppState {
  return {
    ...state,
    auditLogs: [
      {
        id: uid("audit"),
        userId,
        action,
        recordType,
        recordId,
        previousValue,
        newValue,
        createdAt: nowIso(),
      },
      ...state.auditLogs,
    ],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = uid("toast");
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = loadState();
      const next = existing ?? (await createInitialState());
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const user = useMemo(
    () => state?.profiles.find((p) => p.id === state.sessionUserId && p.active) ?? null,
    [state],
  );

  const schoolUsers = useMemo(() => {
    if (!state || !user) return [];
    if (!user.schoolId) return state.profiles.filter((p) => p.id === user.id);
    return state.profiles.filter((p) => p.schoolId === user.schoolId);
  }, [state, user]);

  const schoolProperties = useMemo(() => {
    if (!state || !user?.schoolId) return [];
    return state.properties.filter((p) => p.schoolId === user.schoolId);
  }, [state, user]);

  const schoolSupplies = useMemo(() => {
    if (!state || !user?.schoolId) return [];
    return state.supplies.filter((s) => s.schoolId === user.schoolId);
  }, [state, user]);

  const unreadNotifications = useMemo(() => {
    if (!state || !user) return [];
    return state.notifications.filter((n) => n.userId === user.id && !n.read);
  }, [state, user]);

  const can = useCallback(
    (action: ActionKey) => {
      if (!user) return false;
      if (user.role === "school_head") {
        return ["audit", "users", "school_info", "assign"].includes(action);
      }
      return ["encode", "assign", "transfer", "supplies"].includes(action);
    },
    [user],
  );

  const login = async (identifier: string, password: string) => {
    if (!state) return;
    const hash = await hashSecret(password);
    const match = state.profiles.find((p) => {
      const idMatch =
        p.email.toLowerCase() === identifier.toLowerCase() ||
        p.username?.toLowerCase() === identifier.toLowerCase();
      return idMatch && p.passwordHash === hash && p.active;
    });
    if (!match) throw new Error("Invalid credentials or inactive account.");
    setState((prev) => {
      if (!prev) return prev;
      return audit({ ...prev, sessionUserId: match.id }, match.id, "Login", "session", match.id);
    });
    pushToast({ title: "Signed in", body: `Welcome back, ${match.firstName}.`, tone: "success" });
  };

  const logout = () => {
    setState((prev) => {
      if (!prev || !user) return prev ? { ...prev, sessionUserId: null } : prev;
      return audit({ ...prev, sessionUserId: null }, user.id, "Logout", "session", user.id);
    });
  };

  const register = async (input: RegisterInput) => {
    if (!state) return;
    if (!isNineDigitPassword(input.password)) {
      throw new Error("Password must be exactly 9 digits.");
    }
    if (state.profiles.some((p) => p.email.toLowerCase() === input.email.toLowerCase() && p.active)) {
      throw new Error("This DepEd email is already registered.");
    }
    const createdAt = nowIso();
    const profile: Profile = {
      id: uid("user"),
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() ?? "",
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      passwordHash: await hashSecret(input.password),
      role: input.role ?? "property_custodian",
      schoolId: input.schoolId,
      schoolName: getSchoolName(input.schoolId),
      regionId: input.regionId,
      provinceId: input.provinceId,
      municipalityId: input.municipalityId,
      districtId: input.districtId,
      active: true,
      mustUpdateCredentials: false,
      createdAt,
      updatedAt: createdAt,
    };
    setState((prev) => {
      if (!prev) return prev;
      let next: AppState = { ...prev, profiles: [...prev.profiles, profile] };
      next = audit(next, profile.id, "Account created", "profile", profile.id);
      next = notify(next, next.profiles.filter((p) => p.schoolId === profile.schoolId && p.role === "school_head"), {
        type: "account",
        title: "New Property Custodian registered",
        body: `${profile.firstName} ${profile.lastName} created an account.`,
        href: "/users",
      });
      return next;
    });
    pushToast({ title: "Account created", body: "You can now sign in.", tone: "success" });
  };

  const updateProfile = async (input: Partial<Profile> & { password?: string }) => {
    if (!state || !user) return;
    if (input.password) {
      const isInitialAdmin =
        user.username === INITIAL_ADMIN_USERNAME && input.password === INITIAL_ADMIN_PASSWORD;
      if (!isInitialAdmin && !isNineDigitPassword(input.password)) {
        throw new Error("Password must be exactly 9 digits.");
      }
    }
    const passwordHash = input.password ? await hashSecret(input.password) : user.passwordHash;
    const schoolId = input.schoolId !== undefined ? input.schoolId : user.schoolId;
    const fromSchool = locationFromSchool(schoolId);
    const schoolName = getSchoolName(schoolId) || fromSchool?.schoolName || "";
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.profiles.find((p) => p.id === user.id) ?? user;
      const { password: _password, schoolName: _incomingSchoolName, ...rest } = input;
      const updated: Profile = {
        ...current,
        ...rest,
        schoolId,
        schoolName,
        regionId: rest.regionId ?? fromSchool?.regionId ?? current.regionId,
        provinceId: rest.provinceId ?? fromSchool?.provinceId ?? current.provinceId,
        municipalityId: rest.municipalityId ?? fromSchool?.municipalityId ?? current.municipalityId,
        districtId: rest.districtId ?? fromSchool?.districtId ?? current.districtId,
        passwordHash,
        mustUpdateCredentials: false,
        username: current.username === INITIAL_ADMIN_USERNAME ? current.username : (rest.email ?? current.email),
        updatedAt: nowIso(),
      };
      let next: AppState = {
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === user.id ? updated : p)),
      };
      next = audit(next, user.id, "Profile updated", "profile", user.id, current.schoolId ?? undefined, schoolId ?? undefined);
      return next;
    });
    pushToast({ title: "Profile saved", body: "Account information was updated. Previous activity remains in history.", tone: "success" });
  };

  const replaceSchoolHead = async (input: RegisterInput) => {
    if (!state || !user || user.role !== "school_head") throw new Error("Not authorized.");
    if (!isNineDigitPassword(input.password)) throw new Error("Password must be exactly 9 digits.");
    const createdAt = nowIso();
    const incoming: Profile = {
      id: uid("user"),
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() ?? "",
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      passwordHash: await hashSecret(input.password),
      role: "school_head",
      schoolId: user.schoolId ?? input.schoolId,
      schoolName: getSchoolName(user.schoolId ?? input.schoolId),
      regionId: input.regionId || user.regionId,
      provinceId: input.provinceId || user.provinceId,
      municipalityId: input.municipalityId || user.municipalityId,
      districtId: input.districtId || user.districtId,
      active: true,
      mustUpdateCredentials: false,
      createdAt,
      updatedAt: createdAt,
    };
    setState((prev) => {
      if (!prev) return prev;
      let next: AppState = {
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === user.id ? { ...p, active: false, updatedAt: createdAt } : p,
        ).concat(incoming),
        sessionUserId: incoming.id,
      };
      next = audit(
        next,
        incoming.id,
        "School Head replaced",
        "profile",
        incoming.id,
        `${user.firstName} ${user.lastName}`,
        `${incoming.firstName} ${incoming.lastName}`,
      );
      return next;
    });
    pushToast({
      title: "School Head updated",
      body: "Inventory records were preserved. Previous credentials are no longer valid.",
      tone: "success",
    });
  };

  const createCustodian = async (input: RegisterInput) => {
    if (!user || user.role !== "school_head") throw new Error("Not authorized.");
    await register({ ...input, role: "property_custodian", schoolId: user.schoolId || input.schoolId });
  };

  const setCustodianActive = (userId: string, active: boolean) => {
    if (!user || user.role !== "school_head") return;
    setState((prev) => {
      if (!prev) return prev;
      let next: AppState = {
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === userId ? { ...p, active, updatedAt: nowIso() } : p)),
      };
      next = audit(next, user.id, active ? "Custodian activated" : "Custodian deactivated", "profile", userId);
      return next;
    });
  };

  const encodeProperty = (input: PropertyInput): PropertyRecord => {
    if (!state || !user?.schoolId) throw new Error("School information is required before encoding.");
    if (user.role !== "property_custodian") throw new Error("Only the Property Custodian encodes properties.");
    const createdAt = nowIso();
    const id = uid("prop");
    const totalCost = input.totalCost ?? input.unitCost * input.quantity;
    const record: PropertyRecord = {
      ...input,
      id,
      schoolId: user.schoolId,
      createdBy: user.id,
      totalCost,
      qrCode: `ITAG:${id}`,
      excelGeneratedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    setState((prev) => {
      if (!prev) return prev;
      let next: AppState = {
        ...prev,
        properties: [record, ...prev.properties],
        generatedForms: [{ id: uid("form"), propertyId: id, createdAt }, ...prev.generatedForms],
        propertyHistory: [
          {
            id: uid("hist"),
            propertyId: id,
            action: "created",
            summary: "Property encoded. QR code and Excel form generated automatically.",
            userId: user.id,
            createdAt,
          },
          ...prev.propertyHistory,
        ],
      };
      next = audit(next, user.id, "Property created", "property", id);
      next = notify(next, next.profiles.filter((p) => p.schoolId === user.schoolId), {
        type: "property_registered",
        title: "Property registered",
        body: `${record.propertyNumber} — QR and Excel form generated.`,
        href: `/properties/${id}`,
      });
      return next;
    });
    pushToast({ title: "Property saved", body: "QR code and Excel template were prepared automatically.", tone: "success" });
    return record;
  };

  const updateProperty = (id: string, input: PropertyInput) => {
    if (!user) throw new Error("Not authorized.");
    if (user.role !== "property_custodian") throw new Error("Only the Property Custodian can edit properties.");
    const createdAt = nowIso();
    const totalCost = input.totalCost ?? input.unitCost * input.quantity;
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.properties.find((p) => p.id === id);
      if (!current) return prev;
      let next: AppState = {
        ...prev,
        properties: prev.properties.map((p) =>
          p.id === id ? { ...p, ...input, totalCost, updatedAt: createdAt } : p,
        ),
        propertyHistory: [
          {
            id: uid("hist"),
            propertyId: id,
            action: "updated",
            summary: "Property record updated.",
            userId: user.id,
            createdAt,
          },
          ...prev.propertyHistory,
        ],
      };
      next = audit(next, user.id, "Property updated", "property", id);
      return next;
    });
    pushToast({ title: "Property updated", body: "The existing record was saved.", tone: "success" });
  };

  const assignProperty = (input: {
    propertyId: string;
    accountablePerson: string;
    assignedUserId?: string;
    officeDepartment: string;
    location: string;
    dateAssigned: string;
    deadline?: string;
    status?: "pending" | "active" | "completed";
  }) => {
    if (!user || (user.role !== "property_custodian" && user.role !== "school_head")) throw new Error("Not authorized.");
    const createdAt = nowIso();
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.properties.find((p) => p.id === input.propertyId);
      if (!current) return prev;
      const assignedUser = input.assignedUserId ? prev.profiles.find((p) => p.id === input.assignedUserId) : undefined;
      const accountablePerson = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : input.accountablePerson;
      let next: AppState = {
        ...prev,
        properties: prev.properties.map((p) =>
          p.id === input.propertyId
            ? {
                ...p,
                currentAccountablePerson: accountablePerson,
                officeDepartment: input.officeDepartment,
                location: input.location,
                custodianLastUser: accountablePerson,
                updatedAt: createdAt,
              }
            : p,
        ),
        assignments: [
          {
            id: uid("asg"),
            propertyId: input.propertyId,
            accountablePerson,
            assignedUserId: input.assignedUserId,
            officeDepartment: input.officeDepartment,
            location: input.location,
            dateAssigned: input.dateAssigned,
            deadline: input.deadline,
            status: input.status ?? "active",
            assignedBy: user.id,
            createdAt,
          },
          ...prev.assignments,
        ],
        propertyHistory: [
          {
            id: uid("hist"),
            propertyId: input.propertyId,
            action: "assigned",
            summary: `Assigned to ${accountablePerson}`,
            previousValue: current.currentAccountablePerson,
            newValue: accountablePerson,
            userId: user.id,
            createdAt,
          },
          ...prev.propertyHistory,
        ],
      };
      next = audit(next, user.id, "Property assigned", "property", input.propertyId, current.currentAccountablePerson, accountablePerson);
      const notifyIds = next.profiles
        .filter((p) => p.schoolId === user.schoolId && (p.role === "school_head" || p.id === input.assignedUserId || p.id === user.id))
        .map((p) => p.id);
      next = notify(next, next.profiles, {
        type: "assignment",
        title: "Property assigned",
        body: `${current.propertyNumber} assigned to ${accountablePerson}.`,
        href: "/assignments",
        userIds: notifyIds,
      });
      return next;
    });
    pushToast({ title: "Assignment saved", body: "The assigned user can see this on their dashboard.", tone: "success" });
  };

  const transferProperty = (input: {
    propertyId: string;
    newAccountablePerson: string;
    newOffice: string;
    newLocation: string;
    date: string;
    reason: string;
  }) => {
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const createdAt = nowIso();
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.properties.find((p) => p.id === input.propertyId);
      if (!current) return prev;
      let next: AppState = {
        ...prev,
        properties: prev.properties.map((p) =>
          p.id === input.propertyId
            ? {
                ...p,
                currentAccountablePerson: input.newAccountablePerson,
                officeDepartment: input.newOffice,
                location: input.newLocation,
                custodianLastUser: input.newAccountablePerson,
                updatedAt: createdAt,
              }
            : p,
        ),
        transfers: [
          {
            id: uid("tr"),
            propertyId: input.propertyId,
            previousAccountablePerson: current.currentAccountablePerson,
            newAccountablePerson: input.newAccountablePerson,
            previousOffice: current.officeDepartment,
            newOffice: input.newOffice,
            previousLocation: current.location,
            newLocation: input.newLocation,
            date: input.date,
            reason: input.reason,
            performedBy: user.id,
            createdAt,
          },
          ...prev.transfers,
        ],
        propertyHistory: [
          {
            id: uid("hist"),
            propertyId: input.propertyId,
            action: "transferred",
            summary: `Transferred from ${current.currentAccountablePerson} to ${input.newAccountablePerson}`,
            previousValue: current.currentAccountablePerson,
            newValue: input.newAccountablePerson,
            userId: user.id,
            createdAt,
          },
          ...prev.propertyHistory,
        ],
      };
      next = audit(next, user.id, "Property transferred", "property", input.propertyId, current.currentAccountablePerson, input.newAccountablePerson);
      next = notify(next, next.profiles.filter((p) => p.schoolId === user.schoolId), {
        type: "transfer",
        title: "Property transferred",
        body: `${current.propertyNumber} is now with ${input.newAccountablePerson}.`,
        href: `/properties/${input.propertyId}`,
      });
      return next;
    });
    pushToast({ title: "Transfer confirmed", body: "Current information updated. Previous assignment kept in history.", tone: "success" });
  };

  const verifyProperty = (input: {
    propertyId: string;
    location: string;
    accountablePerson: string;
    condition: PropertyRecord["condition"];
    status: PropertyRecord["status"];
    existenceConfirmed: boolean;
    remarks: string;
  }) => {
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const createdAt = nowIso();
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.properties.find((p) => p.id === input.propertyId);
      if (!current) return prev;
      const verificationStatus = input.existenceConfirmed ? "verified" : "discrepancy";
      let next: AppState = {
        ...prev,
        properties: prev.properties.map((p) =>
          p.id === input.propertyId
            ? {
                ...p,
                location: input.location,
                currentAccountablePerson: input.accountablePerson,
                condition: input.condition,
                status: input.status,
                remarks: input.remarks || p.remarks,
                updatedAt: createdAt,
              }
            : p,
        ),
        verifications: [
          {
            id: uid("ver"),
            propertyId: input.propertyId,
            verifiedBy: user.id,
            date: createdAt.slice(0, 10),
            location: input.location,
            accountablePerson: input.accountablePerson,
            condition: input.condition,
            status: input.status,
            existenceConfirmed: input.existenceConfirmed,
            verificationStatus,
            remarks: input.remarks,
            createdAt,
          },
          ...prev.verifications,
        ],
        propertyHistory: [
          {
            id: uid("hist"),
            propertyId: input.propertyId,
            action: "verified",
            summary: `Inventory verification ${verificationStatus}`,
            userId: user.id,
            createdAt,
          },
          ...prev.propertyHistory,
        ],
      };
      next = audit(next, user.id, "Inventory verification", "property", input.propertyId);
      next = notify(next, next.profiles.filter((p) => p.schoolId === user.schoolId), {
        type: "verification",
        title: "Inventory verification recorded",
        body: `${current.propertyNumber} marked ${verificationStatus}.`,
        href: `/properties/${input.propertyId}`,
      });
      return next;
    });
    pushToast({ title: "Verification saved", body: "Physical check recorded in history and audit trail.", tone: "success" });
  };

  const upsertSupply = (input: Omit<ConsumableSupply, "id" | "schoolId" | "createdBy" | "status" | "createdAt" | "updatedAt"> & { id?: string }) => {
    if (!user?.schoolId || user.role !== "property_custodian") throw new Error("Not authorized.");
    const createdAt = nowIso();
    const status = deriveSupplyStatus(input.currentQuantity, input.minimumStockLevel);
    const record: ConsumableSupply = {
      ...input,
      id: input.id ?? uid("sup"),
      schoolId: user.schoolId,
      createdBy: user.id,
      status,
      createdAt: createdAt,
      updatedAt: createdAt,
    };
    setState((prev) => {
      if (!prev) return prev;
      const exists = input.id && prev.supplies.some((s) => s.id === input.id);
      let next: AppState = {
        ...prev,
        supplies: exists
          ? prev.supplies.map((s) => (s.id === record.id ? { ...record, createdAt: s.createdAt } : s))
          : [record, ...prev.supplies],
      };
      next = audit(next, user.id, exists ? "Supply updated" : "Supply created", "supply", record.id);
      if (status === "low_stock" || status === "out_of_stock") {
        next = notify(next, next.profiles.filter((p) => p.schoolId === user.schoolId), {
          type: "low_stock",
          title: status === "out_of_stock" ? "Supply out of stock" : "Low-stock notification",
          body: `${record.name} is at ${record.currentQuantity} ${record.unit}.`,
          href: "/supplies",
        });
      }
      return next;
    });
    return record;
  };

  const stockIn = (supplyId: string, quantity: number, date: string, reference: string) => {
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const createdAt = nowIso();
    setState((prev) => {
      if (!prev) return prev;
      const supply = prev.supplies.find((s) => s.id === supplyId);
      if (!supply) return prev;
      const currentQuantity = supply.currentQuantity + quantity;
      const status = deriveSupplyStatus(currentQuantity, supply.minimumStockLevel);
      let next: AppState = {
        ...prev,
        supplies: prev.supplies.map((s) =>
          s.id === supplyId ? { ...s, currentQuantity, status, updatedAt: createdAt } : s,
        ),
        stockTransactions: [
          {
            id: uid("stk"),
            supplyId,
            type: "in",
            quantity,
            date,
            reference,
            performedBy: user.id,
            createdAt,
          },
          ...prev.stockTransactions,
        ],
      };
      next = audit(next, user.id, "Stock-in", "supply", supplyId, String(supply.currentQuantity), String(currentQuantity));
      return next;
    });
    pushToast({ title: "Stock-in recorded", body: "Current quantity increased and history was saved.", tone: "success" });
  };

  const stockOut = (supplyId: string, quantity: number, date: string, recipient: string, purpose: string) => {
    if (!user || user.role !== "property_custodian") throw new Error("Not authorized.");
    const current = state?.supplies.find((s) => s.id === supplyId);
    if (!current) throw new Error("Supply not found.");
    if (quantity > current.currentQuantity) throw new Error("Quantity exceeds current stock.");
    const createdAt = nowIso();
    setState((prev) => {
      if (!prev) return prev;
      const supply = prev.supplies.find((s) => s.id === supplyId);
      if (!supply) return prev;
      const currentQuantity = supply.currentQuantity - quantity;
      const status = deriveSupplyStatus(currentQuantity, supply.minimumStockLevel);
      let next: AppState = {
        ...prev,
        supplies: prev.supplies.map((s) =>
          s.id === supplyId ? { ...s, currentQuantity, status, updatedAt: createdAt } : s,
        ),
        stockTransactions: [
          {
            id: uid("stk"),
            supplyId,
            type: "out",
            quantity,
            date,
            reference: purpose,
            recipient,
            purpose,
            performedBy: user.id,
            createdAt,
          },
          ...prev.stockTransactions,
        ],
      };
      next = audit(next, user.id, "Stock-out", "supply", supplyId, String(supply.currentQuantity), String(currentQuantity));
      if (status === "low_stock" || status === "out_of_stock") {
        next = notify(next, next.profiles.filter((p) => p.schoolId === user.schoolId), {
          type: "low_stock",
          title: "Low-stock notification",
          body: `${supply.name} reached ${currentQuantity} ${supply.unit}.`,
          href: "/supplies",
        });
      }
      return next;
    });
    pushToast({ title: "Stock-out recorded", body: "Remaining stock was updated.", tone: "success" });
  };

  const markNotificationRead = (id: string) => {
    setState((prev) =>
      prev
        ? { ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }
        : prev,
    );
  };

  const markAllNotificationsRead = () => {
    if (!user) return;
    setState((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) => (n.userId === user.id ? { ...n, read: true } : n)),
          }
        : prev,
    );
  };

  const findPropertyByQr = (code: string) => {
    const normalized = code.trim();
    const pool = user?.schoolId ? state?.properties.filter((p) => p.schoolId === user.schoolId) : state?.properties;
    return pool?.find(
      (p) =>
        p.qrCode === normalized ||
        p.id === normalized.replace(/^ITAG:/, "") ||
        p.propertyNumber === normalized ||
        p.inventoryItemNumber === normalized ||
        p.icsNumber === normalized,
    );
  };

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        Loading iTAG-PROP…
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
        updateProperty,
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
