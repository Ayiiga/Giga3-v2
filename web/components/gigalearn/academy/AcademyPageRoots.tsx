"use client";

import { AcademyAssessmentPanel } from "@/components/gigalearn/academy/AcademyAssessmentPanel";
import { AcademyAuthorFoundation } from "@/components/gigalearn/academy/AcademyAuthorFoundation";
import { AcademyCatalogue } from "@/components/gigalearn/academy/AcademyCatalogue";
import { AcademyCertificatesPanel } from "@/components/gigalearn/academy/AcademyCertificatesPanel";
import { AcademyCourseDetail } from "@/components/gigalearn/academy/AcademyCourseDetail";
import { AcademyMyCourses } from "@/components/gigalearn/academy/AcademyMyCourses";
import { AcademyVerifyPanel } from "@/components/gigalearn/academy/AcademyVerifyPanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

export function AcademyCatalogueRoot() {
  return (
    <ConvexAppShell>
      <AcademyCatalogue />
    </ConvexAppShell>
  );
}

export function AcademyCourseRoot() {
  return (
    <ConvexAppShell>
      <AcademyCourseDetail />
    </ConvexAppShell>
  );
}

export function AcademyMyCoursesRoot() {
  return (
    <ConvexAppShell>
      <AcademyMyCourses />
    </ConvexAppShell>
  );
}

export function AcademyAuthorRoot() {
  return (
    <ConvexAppShell>
      <AcademyAuthorFoundation />
    </ConvexAppShell>
  );
}

export function AcademyAssessRoot() {
  return (
    <ConvexAppShell>
      <AcademyAssessmentPanel />
    </ConvexAppShell>
  );
}

export function AcademyCertificatesRoot() {
  return (
    <ConvexAppShell>
      <AcademyCertificatesPanel />
    </ConvexAppShell>
  );
}

export function AcademyVerifyRoot() {
  return (
    <ConvexAppShell>
      <AcademyVerifyPanel />
    </ConvexAppShell>
  );
}
