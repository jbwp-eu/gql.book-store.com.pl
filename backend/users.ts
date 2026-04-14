export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
};

export const USERS: UserRecord[] = [
  {
    id: "1",
    name: "Admin",
    email: "admin@test.pl",
    password: "admin",
    isAdmin: true,
  },
];
