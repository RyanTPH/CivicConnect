import { describe, it, expect } from "vitest";
import { validateStaffRequestFilters } from "../service/staffRequestService";

describe("Staff Request Filter Validation", () => {
  it("accepts valid filters", () => {
    expect(
      validateStaffRequestFilters({
        category: "Water",
        status: "Submitted",
        priority: "High",
      })
    ).toEqual({
      category: "Water",
      status: "Submitted",
      priority: "High",
    });
  });

  it("accepts empty filters", () => {
    expect(validateStaffRequestFilters({})).toEqual({});
  });

  it("trims whitespace", () => {
    expect(validateStaffRequestFilters({ status: " Submitted " }))
      .toEqual({ status: "Submitted" });
  });

  it("rejects unsupported filters", () => {
    expect(() =>
      validateStaffRequestFilters({ department: "Finance" })
    ).toThrow("Unsupported request filter: department");
  });

  it("rejects empty values", () => {
    expect(() =>
      validateStaffRequestFilters({ status: " " })
    ).toThrow("Invalid value for status.");
  });

  it("rejects non-string values", () => {
    expect(() =>
      validateStaffRequestFilters({ priority: 123 })
    ).toThrow("Invalid value for priority.");
  });

  it("rejects invalid filter objects", () => {
    expect(() => validateStaffRequestFilters(null))
      .toThrow("Invalid request filters.");

    expect(() => validateStaffRequestFilters(["Submitted"]))
      .toThrow("Invalid request filters.");
  });
});