/**
 * RFC 7807 Problem Details for HTTP APIs
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

const BASE_URI = "https://recommend-scp.dev/errors";

export const ErrorTypes = {
  VALIDATION_ERROR: "validation-error",
  NOT_FOUND: "not-found",
  ONBOARDING_REQUIRED: "onboarding-required",
  INTERNAL_ERROR: "internal-error",
} as const;

export type ErrorTypeKey = keyof typeof ErrorTypes;

export const createProblemDetails = (
  type: ErrorTypeKey,
  title: string,
  status: number,
  detail?: string,
  instance?: string
): ProblemDetails => ({
  type: `${BASE_URI}/${ErrorTypes[type]}`,
  title,
  status,
  detail,
  instance,
});
