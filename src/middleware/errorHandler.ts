import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
}

function isMongoConnectivityError(err: any): boolean {
  const name = err?.name as string | undefined;
  if (!name) return false;
  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    (name === "MongoServerError" && (err.code === "ENOTFOUND" || err.code === "ETIMEDOUT"))
  );
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        requestId: req.requestId,
        details: err.flatten()
      }
    });
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || "SERVER_ERROR";
  let message = err.message || "Unexpected server error";

  /** Mongoose driver errors have no statusCode — avoid misleading HTTP 500 for DB down / Atlas IP block. */
  if (statusCode === 500 && isMongoConnectivityError(err)) {
    statusCode = 503;
    code = "DATABASE_UNAVAILABLE";
    message =
      "Database is unreachable. Check MongoDB is running, MONGODB_URI is correct, and (Atlas) your IP is allowed in Network Access.";
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.requestId,
      details: err.details || undefined
    }
  });
}
