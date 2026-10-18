import { describe, expect, it } from "vitest";
import { validateRegistration } from "../service/registrationValidation";

const validDetails = {
  firstName: "Nomsa",
  lastName: "Zulu",
  email: "nomsa@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
};

describe("Requester registration validation", () => {
  it("accepts valid registration details", () => {
    expect(validateRegistration(validDetails)).toEqual({});
  });

  it("requires a first and last name", () => {
    const errors = validateRegistration({
      ...validDetails,
      firstName: "   ",
      lastName: "",
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
  });

  it("rejects an invalid email address", () => {
    const errors = validateRegistration({
      ...validDetails,
      email: "invalid-email",
    });

    expect(errors.email).toBeDefined();
  });

  it("rejects a short password", () => {
    const errors = validateRegistration({
      ...validDetails,
      password: "1234",
      confirmPassword: "1234",
    });

    expect(errors.password).toBeDefined();
  });

  it("rejects mismatched passwords", () => {
    const errors = validateRegistration({
      ...validDetails,
      confirmPassword: "DifferentPass123!",
    });

    expect(errors.confirmPassword).toBeDefined();
  });
});