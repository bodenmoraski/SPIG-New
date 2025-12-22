import { Injectable, NotFoundException } from '@nestjs/common';
import { Criteria, Rubric } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRubricDto {
  name: string;
}

export interface CreateCriteriaDto {
  name: string;
  description?: string;
  points: number;
}

@Injectable()
export class RubricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find rubrics for a course
   */
  async findByCourse(courseId: number) {
    return this.prisma.rubric.findMany({
      where: { courseId },
      include: {
        _count: {
          select: { criteria: true, assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find rubric by ID with criteria
   */
  async findById(id: number) {
    const rubric = await this.prisma.rubric.findUnique({
      where: { id },
      include: {
        criteria: {
          orderBy: { id: 'asc' },
        },
        course: {
          select: { id: true, name: true },
        },
      },
    });

    if (!rubric) {
      throw new NotFoundException(`Rubric with ID ${id} not found`);
    }

    return rubric;
  }

  /**
   * Create rubric
   */
  async create(courseId: number, data: CreateRubricDto) {
    return this.prisma.rubric.create({
      data: {
        name: data.name,
        courseId,
      },
    });
  }

  /**
   * Update rubric
   */
  async update(id: number, data: Partial<CreateRubricDto>) {
    return this.prisma.rubric.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete rubric
   */
  async delete(id: number) {
    return this.prisma.rubric.delete({
      where: { id },
    });
  }

  /**
   * Add criteria to rubric
   */
  async addCriteria(rubricId: number, data: CreateCriteriaDto) {
    return this.prisma.criteria.create({
      data: {
        name: data.name,
        description: data.description,
        points: data.points,
        rubricId,
      },
    });
  }

  /**
   * Update criteria
   */
  async updateCriteria(id: number, data: Partial<CreateCriteriaDto>) {
    return this.prisma.criteria.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete criteria
   */
  async deleteCriteria(id: number) {
    return this.prisma.criteria.delete({
      where: { id },
    });
  }

  /**
   * Calculate total points for a rubric evaluation
   * Matching Phoenix tally_rubric function
   */
  tallyRubric(criteria: Criteria[], evaluation: Record<string, boolean>): number {
    return criteria.reduce((acc, c) => {
      const isChecked = evaluation[String(c.id)] === true;
      return isChecked ? acc + c.points : acc;
    }, 0);
  }

  /**
   * Get max possible points for a rubric
   */
  getMaxPoints(criteria: Criteria[]): number {
    return criteria
      .filter((c) => c.points > 0)
      .reduce((acc, c) => acc + c.points, 0);
  }

  /**
   * Calculate percentage score
   */
  calculatePercentage(criteria: Criteria[], evaluation: Record<string, boolean>): number {
    const maxPoints = this.getMaxPoints(criteria);
    if (maxPoints === 0) return 0;
    const earnedPoints = this.tallyRubric(criteria, evaluation);
    return (earnedPoints / maxPoints) * 100;
  }
}
