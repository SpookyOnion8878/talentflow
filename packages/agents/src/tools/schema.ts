import { z } from "zod";

/**
 * Converts a simple Zod schema to JSON Schema for LLM function declarations.
 * Supports objects, strings, numbers, booleans, arrays, and enums.
 */
export function zodToJsonSchema(
  schema: z.ZodType<unknown>,
): Record<string, unknown> {
  const shape = shapeOf(schema);
  if (shape) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const isOptional = value instanceof z.ZodOptional;
      const isNullable = value instanceof z.ZodNullable;
      const innerType = isOptional ? value._def.innerType : value;
      const prim = zodPrimitiveType(innerType);
      if (prim) {
        properties[key] = {
          type: prim,
          ...(isNullable ? { nullable: true } : {}),
        };
      }
      if (!isOptional) required.push(key);
    }

    return { type: "object", properties, required };
  }

  const prim = zodPrimitiveType(schema);
  return prim ? { type: prim } : { type: "object" };
}

function shapeOf(
  schema: z.ZodType<unknown>,
): Record<string, z.ZodType<unknown>> | null {
  const shape = (schema as unknown as { shape?: unknown }).shape;
  if (shape && typeof shape === "object" && !Array.isArray(shape)) {
    return shape as Record<string, z.ZodType<unknown>>;
  }
  return null;
}

function zodPrimitiveType(schema: z.ZodType<unknown>): string | null {
  const typeName = schema.constructor?.name ?? "";
  if (typeName.includes("ZodString") || typeName.includes("ZodEnum")) {
    return "string";
  }
  if (typeName.includes("ZodNumber")) return "number";
  if (typeName.includes("ZodBoolean")) return "boolean";
  if (typeName.includes("ZodArray")) return "array";
  return null;
}
