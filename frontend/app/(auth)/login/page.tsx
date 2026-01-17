import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { LoginForm } from "../../../components/forms/login-form";

export const metadata: Metadata = {
  title: "AgriConnect | Login",
  description: "Sign in to access your AgriConnect dashboard",
};

export default function LoginPage() {
  return (
    <Card className="border-none bg-white/0 p-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your credentials to reach your operations dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
