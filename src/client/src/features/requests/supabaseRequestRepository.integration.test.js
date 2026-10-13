
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { createServiceRequest } from "./requestService";
import { saveServiceRequest } from "./supabaseRequestRepository";

// Run real database tests only when explicitly enabled.
const integrationDescribe =
  process.env.RUN_SUPABASE_INTEGRATION === "1"
    ? describe
    : describe.skip;

integrationDescribe("Service request database integration", () => {
  const localUrl = "http://127.0.0.1:54321";

  let requesterId;

  beforeAll(async () => {
    // Ensure we NEVER run against the team's production database.
    if (import.meta.env.VITE_SUPABASE_URL !== localUrl) {
      throw new Error(
        "Integration tests must use the local Supabase sandbox."
      );
    }

    if (!supabase || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error("Local Supabase is not configured.");
    }

    const password = process.env.TEST_REQUESTER_PASSWORD;

    if (!password) {
      throw new Error("Test requester password is missing.");
    }

    // Sign in as our local test requester.
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: "requester104@civicconnect.test",
        password,
      });

    if (authError || !authData.user) {
      throw new Error(
        `Test requester sign-in failed: ${
          authError?.message ?? "No user returned"
        }`
      );
    }

    // Find the linked requester profile.
    const { data: requester, error: requesterError } =
      await supabase
        .from("requesters")
        .select("requester_id")
        .eq("user_id", authData.user.id)
        .single();

    if (requesterError || !requester) {
      throw new Error(
        `Requester lookup failed: ${
          requesterError?.message ?? "Profile missing"
        }`
      );
    }

    requesterId = requester.requester_id;
  });

  afterAll(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  });

  // Helper: count records visible to the signed-in requester.
  async function countRequests(referenceNumber) {
    const { count, error } = await supabase
      .from("service_requests")
      .select("service_request_id", {
        count: "exact",
        head: true,
      })
      .eq("reference_number", referenceNumber);

    expect(error).toBeNull();

    return count;
  }

  // --------------------------------------------------
  // TEST 1: SUCCESSFUL PERSISTENCE AND RETRY
  // --------------------------------------------------

  it("saves a valid request and prevents duplicate retries", async () => {
    const request = createServiceRequest({
      category: "Electricity",
      title: "Integration test - broken streetlight",
      description:
        "Testing CivicConnect persistence in the local sandbox.",
    });

    // Save a real request.
    const saved = await saveServiceRequest(request);

    expect(saved.service_request_id).toBeTruthy();
    expect(saved.reference_number).toBe(
      request.referenceNumber
    );
    expect(saved.requester_id).toBe(requesterId);
    expect(saved.category).toBe("Electricity");
    expect(saved.title).toBe(request.title);
    expect(saved.description).toBe(request.description);

    // Confirm PostgreSQL defaults.
    expect(saved.status).toBe("Submitted");
    expect(saved.priority).toBe("Medium");
    expect(saved.source_channel).toBe("web");
    expect(saved.assigned_staff_id).toBeNull();

    // Retry using the SAME reference number.
    const retried = await saveServiceRequest(request);

    expect(retried.service_request_id).toBe(
      saved.service_request_id
    );

    // Confirm only one matching record exists.
    const count = await countRequests(
      request.referenceNumber
    );

    expect(count).toBe(1);

    console.log("Saved request:", saved.reference_number);
    console.log("Retry returned original:", true);
    console.log("Matching database records:", count);
  });

  // --------------------------------------------------
  // TEST 2: INVALID CATEGORY
  // --------------------------------------------------

  it("rejects an invalid category at database level", async () => {
    const request = createServiceRequest({
      category: "Electricity",
      title: "Integration test - invalid category",
      description:
        "Testing PostgreSQL category validation.",
    });

    // Deliberately bypass JavaScript category validation
    // to confirm the database rejects invalid enum values.
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        reference_number: request.referenceNumber,
        requester_id: requesterId,
        category: "Invalid Test Category",
        title: request.title,
        description: request.description,
      })
      .select()
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    console.log("Invalid category database error:", {
  code: error?.code,
  message: error?.message,
  details: error?.details,
});
    // PostgreSQL rejects invalid enum values.
    expect(error.code).toBe("23514");

    // Confirm the invalid request was not saved.
    const count = await countRequests(
      request.referenceNumber
    );

    expect(count).toBe(0);

    console.log("Invalid category rejected:", error.code);
    console.log("Matching database records:", count);
  });

  // --------------------------------------------------
  // TEST 3: UNAUTHENTICATED REQUEST
  // --------------------------------------------------

  it("rejects a request submitted without authentication", async () => {
    // Create a separate Supabase client with no user session.
    const anonymousClient = createClient(
      localUrl,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: sessionData } =
      await anonymousClient.auth.getSession();

    expect(sessionData.session).toBeNull();

    const request = createServiceRequest({
      category: "Water and Sanitation",
      title: "Integration test - unauthorised request",
      description:
        "Testing unauthenticated database access.",
    });

    // Attempt to insert without an authenticated session.
    const { data, error } = await anonymousClient
      .from("service_requests")
      .insert({
        reference_number: request.referenceNumber,
        requester_id: requesterId,
        category: request.category,
        title: request.title,
        description: request.description,
      })
      .select()
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    // PostgreSQL permission/RLS failure.
    expect(error.code).toBe("42501");

    // Verify no request was inserted.
    const count = await countRequests(
      request.referenceNumber
    );

    expect(count).toBe(0);

    console.log(
      "Unauthenticated submission rejected:",
      error.code
    );
    console.log("Matching database records:", count);
  });
});
