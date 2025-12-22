import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Submission, SectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSubmissionDto {
  value: string;
}

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create submission
   * Matching Phoenix submission creation behavior
   */
  async create(userId: number, assignmentId: number, value: string) {
    // Check if submission already exists
    const existing = await this.prisma.submission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId: userId,
          assignmentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already submitted for this assignment');
    }

    return this.prisma.submission.create({
      data: {
        value,
        studentId: userId,
        assignmentId,
      },
    });
  }

  /**
   * Get user's submission for an assignment
   */
  async findByUserAndAssignment(userId: number, assignmentId: number) {
    return this.prisma.submission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId: userId,
          assignmentId,
        },
      },
    });
  }

  /**
   * Get next ungraded submission for individual grading
   * Matching Phoenix getNextSubmission query
   */
  async getNextForIndividual(userId: number, assignmentId: number) {
    // Find submissions that:
    // 1. Belong to this assignment
    // 2. Are not the current user's submission
    // 3. Don't have a done score from this user
    return this.prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId: { not: userId },
        scores: {
          none: {
            scorerId: userId,
            done: true,
          },
        },
      },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Get next ungraded submission for group grading
   */
  async getNextForGroup(groupId: number, assignmentId: number, sectionId: number) {
    // Get group member IDs to exclude their submissions
    const groupMembers = await this.prisma.sectionMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = groupMembers.map((m) => m.userId);

    // Get all member IDs in the section
    const sectionMembers = await this.prisma.sectionMembership.findMany({
      where: { sectionId },
      select: { userId: true },
    });
    const sectionMemberIds = sectionMembers.map((m) => m.userId);

    // Find submissions that:
    // 1. Belong to this assignment
    // 2. Are from section members
    // 3. Are not from group members (don't grade your own group)
    // 4. Don't have a done score from this group
    return this.prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId: {
          in: sectionMemberIds,
          notIn: memberIds,
        },
        scores: {
          none: {
            groupId,
            done: true,
          },
        },
      },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Count submissions for an assignment from section members
   */
  async countForSection(assignmentId: number, sectionId: number) {
    // Get all section members
    const memberships = await this.prisma.sectionMembership.findMany({
      where: { sectionId },
      select: { userId: true },
    });
    const memberIds = memberships.map((m) => m.userId);

    return this.prisma.submission.count({
      where: {
        assignmentId,
        studentId: { in: memberIds },
      },
    });
  }

  /**
   * Get all submissions for an assignment from section members
   */
  async findByAssignmentAndSection(assignmentId: number, sectionId: number) {
    const memberships = await this.prisma.sectionMembership.findMany({
      where: { sectionId },
      select: { userId: true },
    });
    const memberIds = memberships.map((m) => m.userId);

    return this.prisma.submission.findMany({
      where: {
        assignmentId,
        studentId: { in: memberIds },
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
