/**
 * Middleware to validate request data
 * Use with Next.js API routes to ensure valid input data
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractValidationErrors } from '../validation/schemas';

/**
 * Middleware to validate request body
 * @param request - NextRequest object
 * @param schema - Zod schema for validation
 * @returns Validated data or NextResponse with validation error
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: extractValidationErrors(result)
        },
        { status: 400 }
      );
    }

    return { data: result.data };
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON in request body'
      },
      { status: 400 }
    );
  }
}

/**
 * Middleware to validate query parameters
 * @param request - NextRequest object  
 * @param schema - Zod schema for validation
 * @returns Validated data or NextResponse with validation error
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): { data: T } | NextResponse {
  try {
    // Convert URLSearchParams to plain object
    const searchParams = request.nextUrl.searchParams;
    const queryObject: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      // Handle array params (param[]=value1&param[]=value2)
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2);
        if (!queryObject[arrayKey]) {
          queryObject[arrayKey] = [];
        }
        (queryObject[arrayKey] as string[]).push(value);
      } else {
        queryObject[key] = value;
      }
    });

    const result = schema.safeParse(queryObject);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: extractValidationErrors(result)
        },
        { status: 400 }
      );
    }

    return { data: result.data };
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Error parsing query parameters'
      },
      { status: 400 }
    );
  }
}

