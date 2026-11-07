import type { User as DbUser } from "../../db/users";

declare global {
  namespace Express {
    // Declaration merging needs an interface: req.user is the logged-in user's row.
    interface User extends DbUser {}
    interface Request {
      user?: User;
    }
  }
}
