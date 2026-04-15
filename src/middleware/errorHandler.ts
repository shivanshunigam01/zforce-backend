import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
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

  const statusCode = err.statusCode || 500;
  const code = err.code || "SERVER_ERROR";
  const message = err.message || "Unexpected server error";
  return res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.requestId,
      details: err.details || undefined
    }
  });
}
