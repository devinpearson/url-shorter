import { Request } from 'express';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface User extends IUser {
      _id: string;
    }
    interface Request {
      user?: User;
    }
  }
}
