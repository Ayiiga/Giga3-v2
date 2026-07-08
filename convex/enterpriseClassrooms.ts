import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireOrgMember,
  requireOrgPermission,
  requireTeachingAccess,
} from "./orgAuth";
import { sessionArgs } from "./validators";

export const listClasses = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireOrgMember(
      ctx,
      args.sessionToken,
      args.orgId
    );

    const classes = await ctx.db
      .query("orgClasses")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const active = classes.filter((c) => c.status === "active");

    if (member.role === "teacher") {
      return active
        .filter((c) => c.teacherId === userId)
        .map((c) => ({
          id: c._id,
          name: c.name,
          subject: c.subject ?? "",
          gradeLevel: c.gradeLevel ?? "",
          teacherId: c.teacherId,
          description: c.description ?? "",
          academicYear: c.academicYear ?? "",
          createdAt: c.createdAt,
        }));
    }

    if (member.role === "student") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_org_student", (q) =>
          q.eq("orgId", args.orgId).eq("studentId", userId)
        )
        .collect();
      const classIds = new Set(
        enrollments.filter((e) => e.status === "active").map((e) => e.classId)
      );
      return active
        .filter((c) => classIds.has(c._id))
        .map((c) => ({
          id: c._id,
          name: c.name,
          subject: c.subject ?? "",
          gradeLevel: c.gradeLevel ?? "",
          teacherId: c.teacherId,
          description: c.description ?? "",
          academicYear: c.academicYear ?? "",
          createdAt: c.createdAt,
        }));
    }

    if (member.role === "parent") {
      const enrollments = await ctx.db
        .query("orgEnrollments")
        .withIndex("by_parent", (q) => q.eq("parentId", userId))
        .collect();
      const classIds = new Set(
        enrollments
          .filter((e) => e.orgId === args.orgId && e.status === "active")
          .map((e) => e.classId)
      );
      return active
        .filter((c) => classIds.has(c._id))
        .map((c) => ({
          id: c._id,
          name: c.name,
          subject: c.subject ?? "",
          gradeLevel: c.gradeLevel ?? "",
          teacherId: c.teacherId,
          description: c.description ?? "",
          academicYear: c.academicYear ?? "",
          createdAt: c.createdAt,
        }));
    }

    return active.map((c) => ({
      id: c._id,
      name: c.name,
      subject: c.subject ?? "",
      gradeLevel: c.gradeLevel ?? "",
      teacherId: c.teacherId,
      description: c.description ?? "",
      academicYear: c.academicYear ?? "",
      createdAt: c.createdAt,
    }));
  },
});

export const createClass = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    name: v.string(),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    description: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    teacherId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "class.create"
    );

    const name = args.name.trim().slice(0, 120);
    if (!name) throw new Error("Class name is required");

    const teacherId = args.teacherId?.trim().toLowerCase() || userId;
    const now = Date.now();

    const classId = await ctx.db.insert("orgClasses", {
      orgId: args.orgId,
      name,
      subject: args.subject?.trim().slice(0, 80),
      gradeLevel: args.gradeLevel?.trim().slice(0, 40),
      teacherId,
      description: args.description?.trim().slice(0, 500),
      academicYear: args.academicYear?.trim().slice(0, 20),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "class.created",
      targetType: "class",
      targetId: classId,
      metadataJson: JSON.stringify({ name, teacherId }),
    });

    return { classId };
  },
});

export const enrollStudent = mutation({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    classId: v.id("orgClasses"),
    studentEmail: v.string(),
    parentEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgPermission(
      ctx,
      args.sessionToken,
      args.orgId,
      "student.enroll"
    );

    const klass = await ctx.db.get(args.classId);
    if (!klass || klass.orgId !== args.orgId || klass.status !== "active") {
      throw new Error("Class not found");
    }

    const studentId = args.studentEmail.trim().toLowerCase();
    const parentId = args.parentEmail?.trim().toLowerCase();

    const existing = await ctx.db
      .query("orgEnrollments")
      .withIndex("by_class_student", (q) =>
        q.eq("classId", args.classId).eq("studentId", studentId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        parentId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("orgEnrollments", {
        orgId: args.orgId,
        classId: args.classId,
        studentId,
        parentId,
        status: "active",
        enrolledAt: now,
        updatedAt: now,
      });
    }

    const studentMember = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", studentId)
      )
      .first();
    if (!studentMember) {
      await ctx.db.insert("orgMembers", {
        orgId: args.orgId,
        userId: studentId,
        role: "student",
        status: "active",
        invitedBy: userId,
        joinedAt: now,
        updatedAt: now,
      });
    }

    if (parentId) {
      const parentMember = await ctx.db
        .query("orgMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("orgId", args.orgId).eq("userId", parentId)
        )
        .first();
      if (!parentMember) {
        await ctx.db.insert("orgMembers", {
          orgId: args.orgId,
          userId: parentId,
          role: "parent",
          status: "active",
          invitedBy: userId,
          joinedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.runMutation(internal.enterpriseAudit.logOrgAuditInternal, {
      orgId: args.orgId,
      actorId: userId,
      action: "student.enrolled",
      targetType: "enrollment",
      targetId: studentId,
      metadataJson: JSON.stringify({ classId: args.classId }),
    });

    return { studentId, classId: args.classId };
  },
});

export const listClassEnrollments = query({
  args: {
    ...sessionArgs,
    orgId: v.id("organizations"),
    classId: v.id("orgClasses"),
  },
  handler: async (ctx, args) => {
    await requireTeachingAccess(ctx, args.sessionToken, args.orgId);

    const klass = await ctx.db.get(args.classId);
    if (!klass || klass.orgId !== args.orgId) return [];

    const enrollments = await ctx.db
      .query("orgEnrollments")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .collect();

    return enrollments
      .filter((e) => e.status === "active")
      .map((e) => ({
        studentId: e.studentId,
        parentId: e.parentId ?? null,
        enrolledAt: e.enrolledAt,
      }));
  },
});
