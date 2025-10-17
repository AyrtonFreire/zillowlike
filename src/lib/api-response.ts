import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiError {
  error: string;
  message?: string;
  details?: any;
  code?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Resposta de sucesso padronizada
 */
export function successResponse<T>(data?: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...(data && { data }),
      ...(message && { message }),
    } as ApiSuccess<T>,
    { status }
  );
}

/**
 * Resposta de erro padronizada
 */
export function errorResponse(
  error: string,
  status = 500,
  details?: any,
  code?: string
) {
  return NextResponse.json(
    {
      error,
      ...(details && { details }),
      ...(code && { code }),
    } as ApiError,
    { status }
  );
}

/**
 * Trata erros de validação Zod
 */
export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation error",
      details: error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
      code: "VALIDATION_ERROR",
    } as ApiError,
    { status: 400 }
  );
}

/**
 * Trata erros gerais
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  if (error instanceof Error) {
    // Em produção, não expor stack traces
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message;

    return errorResponse(message, 500);
  }

  return errorResponse("Unknown error occurred", 500);
}

/**
 * Wrapper para route handlers com tratamento de erro
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
