export type AuthRole = "admin" | "user";

type RoleCredential = {
  email: string;
  password: string;
};

export function getRoleCredential(role: AuthRole): RoleCredential {
  if (role === "admin") {
    return {
      email: process.env.AUTH_ADMIN_EMAIL ?? "admin@recruitops.local",
      password: process.env.AUTH_ADMIN_PASSWORD ?? "R3cruitOps!Admin#2026",
    };
  }

  return {
    email: process.env.AUTH_USER_EMAIL ?? "candidate@recruitops.local",
    password: process.env.AUTH_USER_PASSWORD ?? "R3cruitOps!Candidate#2026",
  };
}

export function isValidCredential(role: AuthRole, email: string, password: string): boolean {
  const expected = getRoleCredential(role);
  return email.trim().toLowerCase() === expected.email.toLowerCase() && password === expected.password;
}
