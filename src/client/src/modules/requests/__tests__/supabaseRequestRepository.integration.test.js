import process from "node:process";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

import { supabase } from "../../../shared/lib/supabaseClient";
import { createServiceRequest } from "../service/requestService";
import { saveServiceRequest } from "../repository/supabaseRequestRepository";

// Run real database tests only when explicitly enabled.
const integrationDescribe =
  process.env.RUN_SUPABASE_INTEGRATION === "1"
    ? describe
    : describe.skip;

integrationDescribe("Service request database integration", () => {
  const testEnv = loadEnv("test", process.cwd(), "");

  const stagingUrl = testEnv.VITE_TEST_SUPABASE_STAGING_URL;
  const supabaseUrl = testEnv.VITE_SUPABASE_URL;
  const supabaseKey = testEnv.VITE_SUPABASE_ANON_KEY;

  let requesterId;

  beforeAll(async () => {
    // Ensure the tests use the configured staging project.
    if (
      !stagingUrl ||
      !stagingUrl.startsWith("https://") ||
      supabaseUrl !== stagingUrl
    ) {
      throw new Error(
        "Integration tests must use the approved staging Supabase project."
      );
    }

    if (!supabase || !supabaseKey) {
      throw new Error("Staging Supabase is not configured.");
    }

    const email = testEnv.TEST_REQUESTER_EMAIL;
    const password = testEnv.TEST_REQUESTER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "Test requester email or password is missing."
      );
    }

    // Sign in as the seeded staging requester.
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user) {
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
        "Testing CivicConnect persistence in shared staging.",
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

    // Bypass JavaScript validation to test database constraints.
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

    // PostgreSQL check constraint violation.
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
      stagingUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Confirm no user is signed in.
    const { data: sessionData, error: sessionError } =
      await anonymousClient.auth.getSession();

    expect(sessionError).toBeNull();
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

    console.log("Unauthenticated database error:", {
      code: error?.code,
      message: error?.message,
    });

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