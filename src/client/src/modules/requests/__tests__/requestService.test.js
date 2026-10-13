
import { describe, expect, it } from "vitest";
import { createServiceRequest } from "../service/requestService";

describe("createServiceRequest", () => {
  it("creates a valid CivicConnect service request", () => {
    const request = createServiceRequest({
      category: "Roads and Transport",
      title: "Pothole on Main Street",
      description: "There is a large pothole near the entrance.",
    });

    expect(request.referenceNumber).toMatch(
      /^CC-\d{4}-[A-F0-9]{8}$/
    );
    expect(request.category).toBe("Roads and Transport");
    expect(request.title).toBe("Pothole on Main Street");
    expect(request.description).toBe(
      "There is a large pothole near the entrance."
    );
    expect(request.status).toBe("Submitted");
  });

  it("rejects an empty category", () => {
    expect(() =>
      createServiceRequest({
        category: "",
        title: "Broken streetlight",
        description: "The streetlight is not working.",
      })
    ).toThrow("Please complete all required fields.");
  });

  it("rejects an empty title", () => {
    expect(() =>
      createServiceRequest({
        category: "Electricity",
        title: "   ",
        description: "The streetlight is not working.",
      })
    ).toThrow("Please complete all required fields.");
  });

  it("rejects an empty description", () => {
    expect(() =>
      createServiceRequest({
        category: "Electricity",
        title: "Broken streetlight",
        description: "",
      })
    ).toThrow("Please complete all required fields.");
  });

  it("rejects a category not supported by the database", () => {
    expect(() =>
      createServiceRequest({
        category: "Road Maintenance",
        title: "Pothole",
        description: "There is a pothole near the entrance.",
      })
    ).toThrow("Please select a valid request category.");
  });

  it("removes unnecessary spaces from input", () => {
    const request = createServiceRequest({
      category: "  Waste Management  ",
      title: "  Missed collection  ",
      description: "  The bins were not collected.  ",
    });

    expect(request.category).toBe("Waste Management");
    expect(request.title).toBe("Missed collection");
    expect(request.description).toBe(
      "The bins were not collected."
    );
  });

  it("rejects titles longer than 120 characters", () => {
    expect(() =>
      createServiceRequest({
        category: "Water and Sanitation",
        title: "A".repeat(121),
        description: "A water pipe is leaking.",
      })
    ).toThrow(
      "The request title must be 120 characters or less."
    );
  });

  it("does not require a requester to provide priority", () => {
    const request = createServiceRequest({
      category: "Public Safety",
      title: "Damaged traffic sign",
      description: "A traffic sign has fallen over.",
    });

    expect(request.priority).toBeUndefined();
    expect(request.status).toBe("Submitted");
  });
});
