/** Official Giga3 product identity — use sparingly for trust and professionalism. */
export const GIGA3_VISION = {
  tagline: "Built in Africa. Powered by AI. Designed for Everyone.",
  shortTagline: "Built in Africa · Powered by AI",
  mission:
    "Giga3 AI delivers education, productivity, creativity, commerce, and intelligent assistance from one unified, secure ecosystem — rooted in Ghana and built for the world.",
} as const;

export type UserRoleId =
  | "student"
  | "teacher"
  | "parent"
  | "creator"
  | "business"
  | "developer"
  | "enterprise"
  | "general";

export const USER_ROLES: { id: UserRoleId; label: string; description: string }[] = [
  { id: "student", label: "Student", description: "Homework help, study plans, and exam prep" },
  { id: "teacher", label: "Teacher", description: "Lesson plans, grading aids, and classroom tools" },
  { id: "parent", label: "Parent", description: "Support your child's learning journey" },
  { id: "creator", label: "Creator", description: "Content, media, and monetization tools" },
  { id: "business", label: "Business", description: "Productivity, documents, and automation" },
  { id: "developer", label: "Developer", description: "Coding, APIs, and technical assistance" },
  { id: "enterprise", label: "Enterprise", description: "Teams, orgs, and volume deployments" },
  { id: "general", label: "General user", description: "Explore everything Giga3 has to offer" },
];
