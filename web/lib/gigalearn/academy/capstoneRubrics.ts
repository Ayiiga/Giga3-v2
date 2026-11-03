/**
 * GigaLearn Technology capstone rubric definitions.
 *
 * This file contains versioned assessment criteria only. It does not assign
 * grades; trusted server-side grading must evaluate submitted evidence against
 * a frozen rubric snapshot and route uncertain work to instructor review.
 */

export const TECHNOLOGY_CAPSTONE_COURSES = [
  "ai-machine-learning",
  "robotics-intelligent-systems",
  "mobile-app-development",
  "website-pwa-development",
] as const;

export type TechnologyCapstoneCourseSlug = (typeof TECHNOLOGY_CAPSTONE_COURSES)[number];

export type CapstoneCriterion = {
  id: string;
  title: string;
  weight: number;
  description: string;
  evidenceExpectations: string[];
};

export type CapstoneRubric = {
  courseSlug: TechnologyCapstoneCourseSlug;
  version: string;
  title: string;
  passMark: number;
  criteria: CapstoneCriterion[];
};

const RUBRICS: Record<TechnologyCapstoneCourseSlug, CapstoneRubric> = {
  "ai-machine-learning": {
    courseSlug: "ai-machine-learning",
    version: "ai-capstone-v1",
    title: "Applied AI Solution",
    passMark: 75,
    criteria: [
      { id: "problem", title: "Problem definition and user need", weight: 15, description: "Defines a real problem, intended users and measurable outcome.", evidenceExpectations: ["Problem statement", "Target users", "Success measure"] },
      { id: "solution", title: "AI solution design", weight: 25, description: "Selects an appropriate AI approach and explains its limitations.", evidenceExpectations: ["System or workflow design", "Model/tool choice", "Reason for approach"] },
      { id: "implementation", title: "Working implementation or prototype", weight: 25, description: "Demonstrates a coherent prototype or reproducible workflow.", evidenceExpectations: ["Screenshots or demo", "Prompt/workflow or code", "Reproduction steps"] },
      { id: "evaluation", title: "Testing and evaluation", weight: 20, description: "Tests outputs, identifies failure cases and evaluates usefulness.", evidenceExpectations: ["Test cases", "Observed results", "Limitations or error analysis"] },
      { id: "responsibility", title: "Safety, privacy and communication", weight: 15, description: "Addresses privacy, bias, safety and communicates the result clearly.", evidenceExpectations: ["Risk controls", "Privacy considerations", "Clear project explanation"] },
    ],
  },
  "robotics-intelligent-systems": {
    courseSlug: "robotics-intelligent-systems",
    version: "robotics-capstone-v1",
    title: "Robotics and Intelligent Systems Prototype",
    passMark: 75,
    criteria: [
      { id: "problem", title: "Problem and system requirements", weight: 15, description: "Defines the task, operating environment and constraints.", evidenceExpectations: ["Problem statement", "Use case", "System requirements"] },
      { id: "design", title: "Mechanical and system design", weight: 20, description: "Explains components, architecture and system interactions.", evidenceExpectations: ["Block diagram", "Component list", "Design explanation"] },
      { id: "sensing", title: "Sensors, control and logic", weight: 20, description: "Shows how inputs, decisions and outputs are connected.", evidenceExpectations: ["Sensor/input evidence", "Control logic", "Flowchart or pseudocode"] },
      { id: "prototype", title: "Prototype and demonstration", weight: 25, description: "Demonstrates a safe, functioning prototype or credible simulation.", evidenceExpectations: ["Photos/video or simulation", "Build steps", "Observed behaviour"] },
      { id: "testing", title: "Testing, safety and reflection", weight: 20, description: "Tests performance, identifies risks and proposes improvements.", evidenceExpectations: ["Test results", "Safety precautions", "Improvement notes"] },
    ],
  },
  "mobile-app-development": {
    courseSlug: "mobile-app-development",
    version: "mobile-capstone-v1",
    title: "Mobile Application Project",
    passMark: 75,
    criteria: [
      { id: "problem", title: "Problem definition and user experience", weight: 15, description: "Identifies users, needs and a clear app purpose.", evidenceExpectations: ["Problem statement", "User stories", "Wireframes"] },
      { id: "architecture", title: "App structure and architecture", weight: 20, description: "Uses a coherent app structure and explains key components.", evidenceExpectations: ["Architecture overview", "Navigation map", "Data model"] },
      { id: "functionality", title: "Core functionality", weight: 25, description: "Demonstrates the essential user journeys working.", evidenceExpectations: ["Working build or prototype", "Screenshots/demo", "Feature checklist"] },
      { id: "quality", title: "Testing, accessibility and performance", weight: 20, description: "Tests important flows and considers usability and reliability.", evidenceExpectations: ["Test cases", "Results", "Accessibility/performance notes"] },
      { id: "security", title: "Data protection and release readiness", weight: 20, description: "Explains safe handling of data, permissions and release steps.", evidenceExpectations: ["Data/permission notes", "Security controls", "Release checklist"] },
    ],
  },
  "website-pwa-development": {
    courseSlug: "website-pwa-development",
    version: "web-pwa-capstone-v1",
    title: "Responsive Website and PWA",
    passMark: 75,
    criteria: [
      { id: "planning", title: "Requirements and user experience", weight: 15, description: "Defines audience, goals, content and navigation.", evidenceExpectations: ["Requirements", "Sitemap", "Wireframes"] },
      { id: "implementation", title: "Responsive website implementation", weight: 25, description: "Builds a usable responsive website with sound structure.", evidenceExpectations: ["Live or local demo", "Source files", "Responsive screenshots"] },
      { id: "pwa", title: "PWA capabilities", weight: 20, description: "Demonstrates manifest, installability and appropriate service-worker behaviour.", evidenceExpectations: ["Manifest evidence", "Installability evidence", "Caching/offline explanation"] },
      { id: "quality", title: "Accessibility, performance and testing", weight: 20, description: "Tests across viewports and addresses accessibility and performance.", evidenceExpectations: ["Test results", "Accessibility checks", "Performance notes"] },
      { id: "security", title: "Security, SEO and deployment", weight: 20, description: "Explains safe deployment, basic SEO and relevant security controls.", evidenceExpectations: ["Deployment evidence", "SEO metadata", "Security checklist"] },
    ],
  },
};

export function getTechnologyCapstoneRubric(courseSlug: string): CapstoneRubric | null {
  const slug = courseSlug.trim().toLowerCase() as TechnologyCapstoneCourseSlug;
  const rubric = RUBRICS[slug];
  return rubric ? { ...rubric, criteria: rubric.criteria.map((criterion) => ({ ...criterion, evidenceExpectations: [...criterion.evidenceExpectations] })) } : null;
}

export function validateCapstoneRubric(rubric: CapstoneRubric): boolean {
  const ids = rubric.criteria.map((criterion) => criterion.id);
  return rubric.version.trim().length > 0 &&
    rubric.passMark >= 0 && rubric.passMark <= 100 &&
    rubric.criteria.length >= 3 &&
    new Set(ids).size === ids.length &&
    rubric.criteria.every((criterion) => criterion.weight > 0 && criterion.weight <= 100) &&
    rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) === 100;
}
