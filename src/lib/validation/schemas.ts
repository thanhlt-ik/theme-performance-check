/**
 * Schema validation definitions for API requests
 * Using Zod to ensure data integrity and provide clear error messages
 */
import { z } from 'zod';
import { DeviceType } from '@prisma/client';

// Helper to create error map with direct English messages
const createErrorMap = (): z.ZodErrorMap => {
  return (issue: z.ZodIssue, ctx: z.ErrorMapCtx) => {
    let message: string;

    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.received === 'undefined' || issue.received === 'null') {
          message = `${ctx.data} is required`;
        } else {
          message = `${ctx.data} should be ${issue.expected} but received ${issue.received}`;
        }
        break;
      
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === 'url') {
          message = 'Invalid URL';
        } else if (issue.validation === 'email') {
          message = 'Invalid email';
        } else {
          message = `${ctx.data} is invalid`;
        }
        break;
        
      case z.ZodIssueCode.too_small:
        message = `${ctx.data} must be at least ${issue.minimum} characters`;
        break;
        
      case z.ZodIssueCode.too_big:
        message = `${ctx.data} must not exceed ${issue.maximum} characters`;
        break;
        
      default:
        message = ctx.defaultError;
    }

    return { message };
  };
};

// Configure Zod with custom error map
z.setErrorMap(createErrorMap());

// Schema for valid URL
export const urlSchema = z.string().url().min(5).max(500);

// Schema for valid ID
export const idSchema = z.string().min(1).max(100);

// Schema for DeviceType
export const deviceTypeSchema = z.enum([DeviceType.DESKTOP, DeviceType.MOBILE]);

// Schema for MeasurementRequest
export const measurementRequestSchema = z.object({
  productId: idSchema.describe('Product ID'),
  deviceType: deviceTypeSchema.optional().describe('Device Type')
});

// Schema for DateRange
export const dateRangeSchema = z.object({
  from: z.string().or(z.date()).describe('Start Date'),
  to: z.string().or(z.date()).describe('End Date')
});

// Schema for ExportRequest
export const exportRequestSchema = z.object({
  productIds: z.array(idSchema).optional().describe('Product IDs'),
  dateFrom: z.string().optional().describe('Start Date'),
  dateTo: z.string().optional().describe('End Date'),
  deviceTypes: z.array(deviceTypeSchema).optional().describe('Device Types'),
  format: z.enum(['csv', 'json']).describe('Export Format')
});

// Schema for Product
export const productSchema = z.object({
  name: z.string().min(2).max(100).describe('Product Name'),
  url: urlSchema.describe('Product URL'),
  description: z.string().max(500).optional().describe('Description'),
  isActive: z.boolean().default(true).describe('Active Status')
});

/**
 * Validate a request body with a specific schema
 * @param data - Data to validate
 * @param schema - Validation schema
 * @returns Validation result (success or error)
 */
export function validateRequest<T>(data: unknown, schema: z.ZodType<T>) {
  return schema.safeParse(data);
}

/**
 * Extract error messages from validation result
 * @param result - Failed validation result
 * @returns Object containing error messages
 */
export function extractValidationErrors(result: z.SafeParseError<any>) {
  return result.error.format();
}