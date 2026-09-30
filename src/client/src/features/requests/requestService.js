function createReferenceNumber() {
  const year = new Date().getFullYear();
  const uniquePart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `CC-${year}-${uniquePart}`;
}

export function createServiceRequest({
  category,
  priority,
  title,
  description,
}) {
  const cleanCategory = category.trim();
  const cleanPriority = priority.trim();
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();

  if (
    !cleanCategory ||
    !cleanPriority ||
    !cleanTitle ||
    !cleanDescription
  ) {
    throw new Error("Please complete all required fields.");
  }

  return {
    id: crypto.randomUUID(),
    referenceNumber: createReferenceNumber(),
    category: cleanCategory,
    priority: cleanPriority,
    title: cleanTitle,
    description: cleanDescription,
    status: "Submitted",
    createdAt: new Date().toISOString(),
  };
}