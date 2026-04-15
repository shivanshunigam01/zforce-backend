import { toJSON } from "./api";

/** Remove fields that must not be sent to browsers. */
export function stripCibilRequestForPublic(doc: unknown) {
  const data = { ...toJSON(doc as any) };
  delete (data as { panEncrypted?: string }).panEncrypted;
  delete (data as { surepassRaw?: unknown }).surepassRaw;
  return data;
}
