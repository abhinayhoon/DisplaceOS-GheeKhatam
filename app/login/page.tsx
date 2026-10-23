import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Access the DisplaceOS command dashboard.">
      <LoginForm demo={process.env.DEMO_MODE === "true"} />
    </AuthShell>
  );
}
