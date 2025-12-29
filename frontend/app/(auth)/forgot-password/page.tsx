import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { ForgotPasswordForm } from "../../../components/forms/forgot-password-form";

export const metadata: Metadata = {
  title: "AgriConnect | Reset Password",
  description: "Request a secure reset link for your AgriConnect account",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="border-none bg-white/0 p-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>Enter the email associated with your account and we will send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
