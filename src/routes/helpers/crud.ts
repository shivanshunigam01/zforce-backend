import { Request, Response } from "express";
import { getPagination } from "../../utils/pagination";
import { paginated, toJSON } from "../../utils/api";

export async function listDocuments(req: Request, res: Response, Model: any, filter: any = {}, sort: any = { createdAt: -1 }) {
  const { page, limit, skip } = getPagination(req.query);
  const [rows, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(filter)
  ]);
  return res.json(paginated(page, limit, total, rows.map(toJSON)));
}

export async function createDocument(req: Request, res: Response, Model: any, payload: any) {
  const doc = await Model.create(payload);
  return res.status(201).json({ data: toJSON(doc) });
}

export async function getDocument(req: Request, res: Response, Model: any, filter: any) {
  const doc = await Model.findOne(filter);
  if (!doc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found", requestId: req.requestId } });
  return res.json({ data: toJSON(doc) });
}

export async function patchDocument(req: Request, res: Response, Model: any, filter: any, payload: any) {
  const doc = await Model.findOneAndUpdate(filter, payload, { new: true });
  if (!doc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found", requestId: req.requestId } });
  return res.json({ data: toJSON(doc) });
}

export async function deleteDocument(req: Request, res: Response, Model: any, filter: any, softDelete = true) {
  const doc = softDelete
    ? await Model.findOneAndUpdate(filter, { deletedAt: new Date() }, { new: true })
    : await Model.findOneAndDelete(filter);
  if (!doc) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found", requestId: req.requestId } });
  return res.json({ data: { success: true } });
}
