import { LoginForm } from "@/components/auth/login-form";

export default function UserLoginPage() {
  return (
    <LoginForm
      accent="user"
      title="Candidate Sign in"
      subtitle="Enter the careers workspace to browse opportunities and submit applications."
      endpoint="/api/auth/user-login"
      successRedirect="/careers"
    />
  );
}
