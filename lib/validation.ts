import { ValidationError } from "@/lib/errors";

function normalizeInput(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function readStringField(
  formData: FormData,
  key: string,
  options?: {
    required?: boolean;
    min?: number;
    max?: number;
    fallback?: string;
  },
) {
  const value = normalizeInput(formData.get(key), options?.fallback ?? "");

  if (options?.required && !value) {
    throw new ValidationError(`${key} is required.`);
  }

  if (options?.min && value.length > 0 && value.length < options.min) {
    throw new ValidationError(`${key} must be at least ${options.min} characters.`);
  }

  if (options?.max && value.length > options.max) {
    throw new ValidationError(`${key} must be ${options.max} characters or fewer.`);
  }

  return value;
}

export function readEmailField(formData: FormData, key = "email") {
  const value = readStringField(formData, key, { required: true, max: 254 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError("Enter a valid email address.");
  }

  return value;
}

export function readPasswordField(formData: FormData, key = "password") {
  const value = readStringField(formData, key, { required: true, min: 8, max: 128 });

  if (!/[a-z]/i.test(value) || !/\d/.test(value)) {
    throw new ValidationError("Password must include at least one letter and one number.");
  }

  return value;
}

export function readInternalPath(formData: FormData, key = "next") {
  const value = readStringField(formData, key, { max: 200, fallback: "" });

  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    throw new ValidationError("Invalid redirect target.");
  }

  return value;
}

export function assertEnumValue<T extends string>(value: string, allowed: readonly T[], key: string): T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(`Invalid ${key}.`);
  }

  return value as T;
}
