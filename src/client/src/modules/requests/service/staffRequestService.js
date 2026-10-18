const ALLOWED_FILTERS = ["category", "status", "priority"];

export function validateStaffRequestFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new Error("Invalid request filters.");
  }

  const validatedFilters = {};

  for (const [key, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.includes(key)) {
      throw new Error(`Unsupported request filter: ${key}`);
    }

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Invalid value for ${key}.`);
    }

    validatedFilters[key] = value.trim();
  }

  return validatedFilters;
}
