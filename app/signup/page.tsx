import AuthShell from "@/components/auth/auth-shell";
import SignupForm from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell title="Create account" subtitle="Camp managers and rescue teams. Government accounts are provisioned by NDMA.">
      <SignupForm />
    </AuthShell>
  );
}
