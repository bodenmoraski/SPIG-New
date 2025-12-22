import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Score, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateScoreDto {
  submissionId: number;
  evaluation: Record<string, boolean>;
  assignmentId: number;
  rubricId: number;
}

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create individual score (immediately done)
   */
  async createIndividual(scorerId: number, data: CreateScoreDto) {
    return this.prisma.score.create({
      data: {
        evaluation: data.evaluation,
        signed: {},
        done: true,
        assignmentId: data.assignmentId,
        submissionId: data.submissionId,
        rubricId: data.rubricId,
        scorerId,
        groupId: null,
      },
    });
  }

  /**
   * Find or create group score (upsert pattern matching Phoenix)
   */
  async findOrCreateGroupScore(
    groupId: number,
    submissionId: number,
    assignmentId: number,
    rubricId: number,
  ) {
    // Try to find existing
    let score = await this.prisma.score.findFirst({
      where: {
        groupId,
        submissionId,
        assignmentId,
      },
    });

    // Create if not exists
    if (!score) {
      score = await this.prisma.score.create({
        data: {
          evaluation: {},
          signed: {},
          done: false,
          assignmentId,
          submissionId,
          rubricId,
          scorerId: null,
          groupId,
        },
      });
    }

    return score;
  }

  /**
   * Get group score with full relations
   */
  async getGroupScore(groupId: number, submissionId: number) {
    return this.prisma.score.findFirst({
      where: {
        groupId,
        submissionId,
      },
      include: {
        rubric: {
          include: {
            criteria: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Update evaluation - clears all signatures (matching Phoenix behavior)
   */
  async updateEvaluation(scoreId: number, evaluation: Record<string, boolean>) {
    return this.prisma.score.update({
      where: { id: scoreId },
      data: {
        evaluation,
        signed: {}, // Clear all signatures on any evaluation change
      },
    });
  }

  /**
   * Sign evaluation (add user to signed map)
   */
  async signEvaluation(scoreId: number, userId: number) {
    const score = await this.prisma.score.findUnique({
      where: { id: scoreId },
    });

    if (!score) {
      throw new NotFoundException(`Score with ID ${scoreId} not found`);
    }

    const signed = (score.signed as Record<string, boolean>) || {};
    signed[String(userId)] = true;

    return this.prisma.score.update({
      where: { id: scoreId },
      data: { signed },
    });
  }

  /**
   * Check if consensus is reached (all group members signed)
   */
  async isConsensusReached(scoreId: number, groupId: number): Promise<boolean> {
    const score = await this.prisma.score.findUnique({
      where: { id: scoreId },
    });

    if (!score) {
      return false;
    }

    // Get all group members
    const members = await this.prisma.sectionMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const signed = (score.signed as Record<string, boolean>) || {};

    // Check if all members have signed
    return members.every((m) => signed[String(m.userId)] === true);
  }

  /**
   * Mark score as done
   */
  async markDone(scoreId: number) {
    return this.prisma.score.update({
      where: { id: scoreId },
      data: { done: true },
    });
  }

  /**
   * Get all scores for a submission
   */
  async getScoresForSubmission(submissionId: number) {
    return this.prisma.score.findMany({
      where: {
        submissionId,
        done: true,
      },
      include: {
        scorer: {
          select: { id: true, name: true, role: true },
        },
        group: true,
      },
    });
  }

  /**
   * Get all scores for an assignment (for report generation)
   */
  async getScoresForAssignment(assignmentId: number) {
    return this.prisma.score.findMany({
      where: {
        assignmentId,
        done: true,
      },
      include: {
        submission: {
          select: { id: true, studentId: true },
        },
        scorer: {
          select: { id: true, role: true },
        },
        rubric: {
          include: {
            criteria: true,
          },
        },
        group: true,
      },
    });
  }

  /**
   * Check if user has access to score (is scorer or in group)
   */
  async hasAccess(scoreId: number, userId: number): Promise<boolean> {
    const score = await this.prisma.score.findUnique({
      where: { id: scoreId },
    });

    if (!score) {
      return false;
    }

    // Individual score - must be scorer
    if (score.scorerId) {
      return score.scorerId === userId;
    }

    // Group score - must be in group
    if (score.groupId) {
      const membership = await this.prisma.sectionMembership.findFirst({
        where: {
          groupId: score.groupId,
          userId,
        },
      });
      return !!membership;
    }

    return false;
  }
}
