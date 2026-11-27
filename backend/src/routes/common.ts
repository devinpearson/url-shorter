import type { NextFunction, Request, Response } from "express";

// Express 4 does not catch errors from async handlers; forward them to `next`.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export const asyncHandler =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

/** The logged-in user's id. Only for routes that run after ensureAuth, so req.user is set. */
export function userId(req: Request) {
  if (!req.user) throw new Error("ensureAuth must run before this route");
  return req.user.id;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);
