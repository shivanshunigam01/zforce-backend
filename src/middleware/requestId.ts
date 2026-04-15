import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = (req.header("X-Request-Id") || uuidv4()).toString();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
