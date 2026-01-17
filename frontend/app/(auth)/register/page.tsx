import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { RegisterForm } from "../../../components/forms/register-form";

export const metadata: Metadata = {
  title: "AgriConnect | Create Account",
  description: "Register to join AgriConnect",
};

export default function RegisterPage() {
  return (
    <Card className="border-none bg-white/0 p-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Bring your farming, buying, or admin workflows together in one platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
