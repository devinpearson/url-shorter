import type { IUser } from "../../models/User";

declare global {
  namespace Express {
    // Declaration merging needs an interface: req.user is a User document.
    interface User extends IUser {}
    interface Request {
      user?: User;
    }
  }
}
