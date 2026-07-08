import type { ExamBoardId, LearnerRole } from "@/lib/gigalearn/curricula";

export interface GigaLearnProfile {
  role: LearnerRole;
  examBoard: ExamBoardId;
  level: string;
  subjects: string[];
  updatedAt: number;
}

const PROFILE_KEY = "giga3_gigalearn_profile";

const DEFAULT_PROFILE: GigaLearnProfile = {
  role: "student",
  examBoard: "bece",
  level: "jhs-2",
  subjects: ["mathematics", "english", "science"],
  updatedAt: 0,
};

function readProfile(): GigaLearnProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<GigaLearnProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function getGigaLearnProfile(): GigaLearnProfile {
  return readProfile();
}

export function saveGigaLearnProfile(
  patch: Partial<Omit<GigaLearnProfile, "updatedAt">>
): GigaLearnProfile {
  const next: GigaLearnProfile = {
    ...readProfile(),
    ...patch,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
