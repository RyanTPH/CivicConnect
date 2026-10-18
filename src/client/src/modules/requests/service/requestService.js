import { fetchMyServiceRequests,fetchMyServiceRequestDetails } from "../repository/supabaseRequestRepository";


const VALID_CATEGORIES = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

function createReferenceNumber() {
  const year = new Date().getFullYear();
  const uniquePart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `CC-${year}-${uniquePart}`;
}

export function createServiceRequest({
  category,
  title,
  description,
} = {}) {
  const cleanCategory =
    typeof category === "string" ? category.trim() : "";
  const cleanTitle =
    typeof title === "string" ? title.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";

  // Ensure all required fields contain information.
  if (!cleanCategory || !cleanTitle || !cleanDescription) {
    throw new Error("Please complete all required fields.");
  }

  // Only accept categories supported by the database.
  if (!VALID_CATEGORIES.includes(cleanCategory)) {
    throw new Error("Please select a valid request category.");
  }

  // Match the existing form's title limit.
  if (cleanTitle.length > 120) {
    throw new Error("The request title must be 120 characters or less.");
  }

  return {
    referenceNumber: createReferenceNumber(),
    category: cleanCategory,
    title: cleanTitle,
    description: cleanDescription,
    status: "Submitted",
  };
}


// Retrieve the authenticated requester's requests.
export async function listMyServiceRequests() {
  return fetchMyServiceRequests();
}

// Retrieve an authorised complaint with its history and comments.
export async function getMyServiceRequestDetails(requestId) {
  return fetchMyServiceRequestDetails(requestId);
}