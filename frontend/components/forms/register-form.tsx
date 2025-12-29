"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";

import { login as loginRequest, register as registerRequest } from "../../lib/api/auth";
import { useAuthStore } from "../../lib/store/auth-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, type SelectOption } from "../ui/select";
const roleOptions: SelectOption[] = [
  { label: "Farmer", value: "farmer" },
  { label: "Buyer", value: "buyer" },
  { label: "Admin", value: "admin" },
];

const registerSchema = z
  .object({
    fullName: z.string().min(3, "Please enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    role: z.enum(["farmer", "buyer", "admin"]),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/(?=.*[A-Z])/, "Include at least one uppercase letter")
      .regex(/(?=.*\d)/, "Include at least one number"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    terms: z.boolean().refine((value) => value, { message: "You must accept the terms" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export interface RegisterFormProps {
  redirectPath?: string;
  onSuccess?: () => void;
  showLoginLink?: boolean;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unable to create account. Please try again.";
}

function getNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts.shift() ?? "";
  const last = parts.length ? parts.join(" ") : first;
  return { first, last };
}

function calculatePasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

export function RegisterForm({ redirectPath = "/dashboard", onSuccess, showLoginLink = true }: RegisterFormProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register: registerField,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: undefined,
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";
  const strength = calculatePasswordStrength(passwordValue);
  const strengthPercent = Math.min((strength / 4) * 100, 100);
  const strengthLabel = strength ? strengthLabels[strength - 1] ?? strengthLabels[strengthLabels.length - 1] : strengthLabels[0];

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const { first, last } = getNameParts(values.fullName);
      await registerRequest({
        email: values.email,
        password: values.password,
        first_name: first,
        last_name: last,
        phone_number: values.phone,
        role: values.role,
      });

      const loginResponse = await loginRequest({ email: values.email, password: values.password });
      setUser(loginResponse.user);
      toast.success("Account created successfully");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <Input
            id="fullName"
            placeholder="Ama Farmer"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullname-error" : undefined}
            {...registerField("fullName")}
          />
          {errors.fullName && (
            <span id="fullname-error" role="alert" className="text-xs text-red-500">
              {errors.fullName.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+254 700 000 000"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            {...registerField("phone")}
          />
          {errors.phone && (
            <span id="phone-error" role="alert" className="text-xs text-red-500">
              {errors.phone.message}
            </span>
          )}
        </div>
      </div>

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
          {...registerField("email")}
        />
        {errors.email && (
          <span id="email-error" role="alert" className="text-xs text-red-500">
            {errors.email.message}
          </span>
        )}
      </div>

      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <Select
            label="Role"
            placeholder="Select your role"
            value={field.value}
            onChange={field.onChange}
            options={roleOptions}
            error={errors.role?.message}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : "password-strength"}
            {...registerField("password")}
          />
          {errors.password ? (
            <span id="password-error" role="alert" className="text-xs text-red-500">
              {errors.password.message}
            </span>
          ) : (
            <div id="password-strength" className="text-xs text-foreground/70">
              Strength: {strengthLabel}
              <div className="mt-1 h-2 rounded-full bg-border/60" aria-hidden>
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${strengthPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
            {...registerField("confirmPassword")}
          />
          {errors.confirmPassword && (
            <span id="confirm-error" role="alert" className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </span>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground/80">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          {...registerField("terms")}
          aria-invalid={Boolean(errors.terms)}
          aria-describedby={errors.terms ? "terms-error" : undefined}
        />
        <span>
          I agree to the
          <Link href="/terms" className="ml-1 text-accent hover:underline">
            Terms & Conditions
          </Link>{" "}
          and
          <Link href="/privacy" className="ml-1 text-accent hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>
      {errors.terms && (
        <span id="terms-error" role="alert" className="-mt-2 text-xs text-red-500">
          {errors.terms.message}
        </span>
      )}

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Create account
      </Button>

      {showLoginLink && (
        <p className="text-center text-sm text-foreground/70">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}
