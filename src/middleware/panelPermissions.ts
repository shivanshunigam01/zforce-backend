import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export type ModulePermission =
  | "dashboard"
  | "crm"
  | "inventory"
  | "invoicing"
  | "payments"
  | "dealer_management"
  | "account_management"
  | "user_management"
  | "master_management"
  | "hr"
  | "reports"
  | "cms"
  | "settings";

function defaultModuleAccess(role: string, module: ModulePermission): boolean {
  if (role === "super_admin" || role === "ho_staff") return true;
  if (role === "dealer") {
    return !["dealer_management", "account_management", "user_management", "master_management", "hr", "cms", "settings"].includes(module);
  }
  if (role === "distributor") {
    return !["account_management", "user_management", "hr", "settings"].includes(module);
  }
  return false;
}

function hasModuleAccess(req: Request, module: ModulePermission): boolean {
  const role = String(req.user?.role || "");
  const p = (req.user?.permissions || []).filter(Boolean);
  if (!p.length) return defaultModuleAccess(role, module);
  return p.includes(module);
}

export function requireModulePermission(module: ModulePermission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (hasModuleAccess(req, module)) return next();
    return next(new AppError(403, "FORBIDDEN", `Module access denied: ${module}`));
  };
}
