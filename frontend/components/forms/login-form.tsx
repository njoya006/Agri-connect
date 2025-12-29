"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "react-hot-toast";

import { login as loginRequest } from "../../lib/api/auth";
import { useAuthStore } from "../../lib/store/auth-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  redirectPath?: string;
  onSuccess?: () => void;
  showLinks?: boolean;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unable to sign in. Please try again.";
}

export function LoginForm({ redirectPath = "/dashboard", onSuccess, showLinks = true }: LoginFormProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await loginRequest(values);
      setUser(response.user);
      toast.success("Welcome back to AgriConnect");
      onSuccess?.();
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <span id="email-error" role="alert" className="text-xs text-red-500">
            {errors.email.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          {showLinks && (
            <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <span id="password-error" role="alert" className="text-xs text-red-500">
            {errors.password.message}
          </span>
        )}
      </div>

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Sign in
      </Button>

      {showLinks && (
        <p className="text-center text-sm text-foreground/70">
          Don&apos;t have an account? {" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      )}
    </form>
  );
}
