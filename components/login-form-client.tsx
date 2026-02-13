"use client";

import { useRouter } from "next/navigation";
import SignInForm from "@/components/SignInForm";

export function LoginFormClient() {
  const router = useRouter();

  return (
    <SignInForm
      onSignIn={() => {
        router.refresh();
        router.push("/");
      }}
      onResetPassword={() => router.push("/reset-password")}
    />
  );
}
