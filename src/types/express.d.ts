declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      role: string;
      tenantId?: string;
      dealerId?: string;
      branchIds?: string[];
      permissions?: string[];
    };
    requestId?: string;
    storefront?: any;
    rawBody?: Buffer;
  }
}
