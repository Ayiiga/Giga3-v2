import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireOrgMember,
  requireOrgPermission,
  requireTeachingAccess,
} from "./orgAuth";
import { recordOrgUsage } from "./enterpriseAudit";
import { sessionArgs } from "./validators";

export const listAssignments = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    classId: v.optional(v.id("orgClasses")),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );

    let rows = await ctx.db
      .query("orgAssignments")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (args.classId) {
      rows = rows.filter((r) => r.classId === args.classId);
    }

    if (member.role === "teacher") {
      rows = rows.filter((r) => r.teacherId === userId);
    } else if (member.role === "student") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_org_student", (q) =>
          q.eq("orgId", args.orgId).eq("studentId", userId)
        )
        .collect();
      const classIds = new Set(
        enrollments.filter((e) => e.status === "active").map((e) => e.classId)
      );
      rows = rows.filter(
        (r) => classIds.has(r.classId) && r.status === "published"
      );
    } else if (member.role === "parent") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_parent", (q) => q.eq("parentId", userId))
        .collect();
      const classIds = new Set(
        enrollments
          .filter((e) => e.orgId === args.orgId && e.status === "active")
          .map((e) => e.classId)
      );
      rows = rows.filter(
        (r) => classIds.has(r.classId) && r.status === "published"
      );
    } else if (
      member.role !== "org_admin" &&
      member.role !== "school_admin"
    ) {
      rows = rows.filter((r) => r.status === "published");
    }

    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        id: r._id,
        classId: r.classId,
        title: r.title,
        description: r.description,
        dueAt: r.dueAt ?? null,
        status: r.status,
        teacherId: r.teacherId,
        createdAt: r.createdAt,
      }));
  },
});

export const createAssignment = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    classId: v.id("orgClasses"),
    title: v.string(),
    description: v.string(),
    dueAt: v.optional(v.number()),
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "assignment.create"
    );

    const klass = await ctx.db.get(args.classId);
    if (!klass || klass.orgId !== args.orgId) {
      throw new Error("Class not found");
    }

    const title = args.title.trim().slice(0, 160);
    const description = args.description.trim().slice(0, 4000);
    if (!title) throw new Error("Title is required");

    const now = Date.now();
    const status = args.publish ? ("published" as const) : ("draft" as const);

    const assignmentId = await ctx.db.insert("orgAssignments", {
      orgId: args.orgId,
      classId: args.classId,
      teacherId: userId,
      title,
      description,
      dueAt: args.dueAt,
      status,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "assignment.created",
      targetType: "assignment",
      targetId: assignmentId,
      metadataJson: JSON.stringify({ status, classId: args.classId }),
    });

    await recordOrgUsage(ctx, args.orgId, { learningSessions: 1 });

    return { assignmentId, status };
  },
});

export const publishAssignment = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    assignmentId: v.id("orgAssignments"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "assignment.publish"
    );

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.orgId !== args.orgId) {
      throw new Error("Assignment not found");
    }
    if (
      assignment.teacherId !== userId &&
      member.role !== "org_admin" &&
      member.role !== "school_admin"
    ) {
      throw new Error("Not allowed to publish this assignment");
    }

    await ctx.db.patch(assignment._id, {
      status: "published",
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "assignment.published",
      targetType: "assignment",
      targetId: args.assignmentId,
    });

    return { published: true as const };
  },
});

export const submitAssignment = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    assignmentId: v.id("orgAssignments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "assignment.submit"
    );

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.orgId !== args.orgId) {
      throw new Error("Assignment not found");
    }
    if (assignment.status !== "published") {
      throw new Error("Assignment is not open for submission");
    }

    const content = args.content.trim().slice(0, 8000);
    if (!content) throw new Error("Submission content is required");

    const now = Date.now();
    const isLate = assignment.dueAt ? now > assignment.dueAt : false;

    const existing = await ctx.db
      .query("orgAssignmentSubmissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        status: isLate ? "late" : "submitted",
        submittedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("orgAssignmentSubmissions", {
        orgId: args.orgId,
        assignmentId: args.assignmentId,
        studentId: userId,
        content,
        status: isLate ? "late" : "submitted",
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "assignment.submitted",
      targetType: "assignment",
      targetId: args.assignmentId,
    });

    await recordOrgUsage(ctx, args.orgId, { assignmentsSubmitted: 1 });

    return { submitted: true as const, late: isLate };
  },
});

export const gradeSubmission = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    submissionId: v.id("orgAssignmentSubmissions"),
    score: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "assignment.grade"
    );

    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.orgId !== args.orgId) {
      throw new Error("Submission not found");
    }

    const score = Math.max(0, Math.min(100, Math.round(args.score)));

    await ctx.db.patch(submission._id, {
      score,
      feedback: args.feedback?.trim().slice(0, 2000),
      status: "graded",
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "assignment.graded",
      targetType: "submission",
      targetId: args.submissionId,
      metadataJson: JSON.stringify({ score }),
    });

    return { score };
  },
});

export const listSubmissions = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    assignmentId: v.optional(v.id("orgAssignments")),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );

    let rows = await ctx.db
      .query("orgAssignmentSubmissions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (args.assignmentId) {
      rows = rows.filter((r) => r.assignmentId === args.assignmentId);
    }

    if (member.role === "student") {
      rows = rows.filter((r) => r.studentId === userId);
    } else if (member.role === "parent") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_parent", (q) => q.eq("parentId", userId))
        .collect();
      const studentIds = new Set(
        enrollments
          .filter((e) => e.orgId === args.orgId && e.status === "active")
          .map((e) => e.studentId)
      );
      rows = rows.filter((r) => studentIds.has(r.studentId));
    } else if (member.role === "teacher") {
      if (args.assignmentId) {
        const assignment = await ctx.db.get(args.assignmentId);
        if (assignment && assignment.teacherId !== userId) {
          rows = [];
        }
      } else {
        const teacherAssignments = await ctx.db
          .query("orgAssignments")
          .withIndex("by_teacher", (q) => q.eq("teacherId", userId))
          .collect();
        const assignmentIds = new Set(teacherAssignments.map((a) => a._id));
        rows = rows.filter((r) => assignmentIds.has(r.assignmentId));
      }
    }

    if (args.studentId) {
      const sid = args.studentId.trim().toLowerCase();
      rows = rows.filter((r) => r.studentId === sid);
    }

    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => ({
        id: r._id,
        assignmentId: r.assignmentId,
        studentId: r.studentId,
        content: r.content ?? "",
        status: r.status,
        score: r.score ?? null,
        feedback: r.feedback ?? "",
        submittedAt: r.submittedAt ?? null,
        updatedAt: r.updatedAt,
      }));
  },
});

export const getStudentProgress = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );

    let targetStudent = args.studentId?.trim().toLowerCase() ?? userId;

    if (member.role === "parent") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_parent", (q) => q.eq("parentId", userId))
        .collect();
      const children = enrollments
        .filter((e) => e.orgId === args.orgId && e.status === "active")
        .map((e) => e.studentId);
      if (args.studentId) {
        if (!children.includes(targetStudent)) {
          throw new Error("Parent can only view linked students");
        }
      } else {
        targetStudent = children[0] ?? "";
      }
      if (!targetStudent) {
        return {
          studentId: "",
          totalAssignments: 0,
          submitted: 0,
          graded: 0,
          averageScore: null as number | null,
          completionRate: 0,
        };
      }
    } else if (member.role === "student") {
      targetStudent = userId;
    } else if (
      member.role !== "teacher" &&
      member.role !== "org_admin" &&
      member.role !== "school_admin"
    ) {
      throw new Error("Not allowed to view student progress");
    }

    const assignments = await ctx.db
      .query("orgAssignments")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "published")
      )
      .collect();

    const enrollments = await ctx.db
      .query("orgEnrollments")
      .withIndex("by_org_student", (q) =>
        q.eq("orgId", args.orgId).eq("studentId", targetStudent)
      )
      .collect();
    const classIds = new Set(
      enrollments.filter((e) => e.status === "active").map((e) => e.classId)
    );
    const relevant = assignments.filter((a) => classIds.has(a.classId));

    const submissions = await ctx.db
      .query("orgAssignmentSubmissions")
      .withIndex("by_student", (q) => q.eq("studentId", targetStudent))
      .collect();
    const orgSubmissions = submissions.filter((s) => s.orgId === args.orgId);

    const submitted = orgSubmissions.filter(
      (s) => s.status === "submitted" || s.status === "graded" || s.status === "late"
    ).length;
    const graded = orgSubmissions.filter((s) => s.status === "graded");
    const scores = graded
      .map((s) => s.score)
      .filter((s): s is number => typeof s === "number");
    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    return {
      studentId: targetStudent,
      totalAssignments: relevant.length,
      submitted,
      graded: graded.length,
      averageScore,
      completionRate:
        relevant.length > 0
          ? Math.round((submitted / relevant.length) * 100)
          : 0,
    };
  },
});
