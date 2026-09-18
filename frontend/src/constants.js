// Must match backend/app/schemas/complaint.py's Category/Status literals.
export const CATEGORIES = [
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Garbage" },
  { value: "streetlight", label: "Streetlight" },
  { value: "water_supply", label: "Water Supply" },
  { value: "other", label: "Other" },
];

export const STATUSES = ["New", "Assigned", "In Progress", "Resolved", "Closed", "Reopened"];
