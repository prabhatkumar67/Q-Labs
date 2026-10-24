import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <LoginForm
      accent="admin"
      title="Admin Sign in"
      subtitle="Access the recruiter command center for jobs, candidates, and interviews."
      endpoint="/api/auth/login"
      successRedirect="/admin"
    />
  );
}
