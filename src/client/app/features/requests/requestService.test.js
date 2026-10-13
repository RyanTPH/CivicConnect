import { describe, expect, it } from "vitest";
import { createServiceRequest } from "./requestService";

describe("createServiceRequest", () => {
    it("creates a valid CivicConnect service request", () => {
        const request = createServiceRequest({
            category: "Road Maintenance",
            priority: "High",
            title: "Pothole on Main Street",
            description: "There is a large pothole near the entrance.",
        });

        expect(request.id).toBeTruthy();
        expect(request.referenceNumber).toMatch(/^CC-\d{4}-[A-F0-9]{8}$/);
        expect(request.category).toBe("Road Maintenance");
        expect(request.priority).toBe("High");
        expect(request.title).toBe("Pothole on Main Street");
        expect(request.description).toBe(
            "There is a large pothole near the entrance."
        );
        expect(request.status).toBe("Submitted");
        expect(request.createdAt).toBeTruthy();
    });

    it("rejects a request when a required field is empty", () => {
        expect(() =>
            createServiceRequest({
                category: "",
                priority: "Medium",
                title: "Broken streetlight",
                description: "The streetlight is not working.",
            })
        ).toThrow("Please complete all required fields.");
    });

    it("removes unnecessary spaces from request input", () => {
        const request = createServiceRequest({
            category: "  Waste Collection  ",
            priority: "  Low  ",
            title: "  Missed collection  ",
            description: "  The bins were not collected.  ",
        });

        expect(request.category).toBe("Waste Collection");
        expect(request.priority).toBe("Low");
        expect(request.title).toBe("Missed collection");
        expect(request.description).toBe("The bins were not collected.");
    });
});