export type TRole = "SUPER_ADMIN" | "CUSTOMER";

export type TAuthUser = {
  id: string;
  email: string;
  role: TRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
