"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";

import { resetPassword } from "../../lib/api/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const resetSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type ForgotPasswordValues = z.infer<typeof resetSchema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await resetPassword(values.email);
      setSubmitted(true);
      toast.success("Reset instructions sent to your email");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset link";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <span id="forgot-email-error" role="alert" className="text-xs text-red-500">
            {errors.email.message}
          </span>
        )}
      </div>

      {submitted && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Check your inbox for a secure link to reset your password. Remember to also look in the spam folder.
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-foreground/70">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Go back to login
        </Link>
      </p>
    </form>
  );
}
