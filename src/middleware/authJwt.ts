import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/auth";
import { AppError } from "../utils/errors";

export function authJwt(requiredRoles?: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header("Authorization");
      if (!header?.startsWith("Bearer ")) {
        throw new AppError(401, "UNAUTHORIZED", "Missing bearer token");
      }
      const token = header.slice(7);
      const payload = verifyAccessToken(token);
      req.user = payload;
      if (requiredRoles?.length && !requiredRoles.includes(payload.role)) {
        throw new AppError(403, "FORBIDDEN", "Insufficient role");
      }
      next();
    } catch (error: any) {
      next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token", { cause: error.message }));
    }
  };
}

export function requireTenantScope(req: Request, _res: Response, next: NextFunction) {
  const tenantId = req.params.tenantId;
  if (req.user?.role === "super_admin") return next();
  if (!tenantId || req.user?.tenantId !== tenantId) {
    return next(new AppError(403, "FORBIDDEN", "Tenant mismatch"));
  }
  next();
}

export function requireDealerScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.dealerId) return next(new AppError(403, "FORBIDDEN", "Dealer scope missing"));
  next();
}
