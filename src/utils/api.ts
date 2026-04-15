import { Response } from "express";

export function ok(res: Response, data: any, meta?: any) {
  return res.json(meta ? { data, meta } : { data });
}

export function created(res: Response, data: any) {
  return res.status(201).json({ data });
}

export function paginated(page: number, limit: number, total: number, data: any[]) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

export function toJSON(doc: any) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (obj._id) {
    obj.id = String(obj._id);
    delete obj._id;
  }
  if (obj.__v !== undefined) delete obj.__v;
  return obj;
}
