import { Injectable, NotFoundException } from '@nestjs/common';
import { Assignment } from '@prisma/client';
import { join } from 'path';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAssignmentDto {
  name: string;
  instructions?: string;
  rubricId?: number;
}

@Injectable()
export class AssignmentsService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {
    // Ensure uploads directory exists
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Find assignments for a course
   */
  async findByCourse(courseId: number) {
    return this.prisma.assignment.findMany({
      where: { courseId },
      include: {
        rubric: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find assignment by ID
   */
  async findById(id: number) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        rubric: {
          include: {
            criteria: {
              orderBy: { id: 'asc' },
            },
          },
        },
        course: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return {
      ...assignment,
      hasPdf: this.pdfExists(id),
    };
  }

  /**
   * Create assignment
   */
  async create(courseId: number, data: CreateAssignmentDto) {
    return this.prisma.assignment.create({
      data: {
        name: data.name,
        instructions: data.instructions,
        rubricId: data.rubricId,
        courseId,
      },
    });
  }

  /**
   * Update assignment
   */
  async update(id: number, data: Partial<CreateAssignmentDto>) {
    return this.prisma.assignment.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete assignment
   */
  async delete(id: number) {
    // Delete PDF if exists
    this.deletePdf(id);

    return this.prisma.assignment.delete({
      where: { id },
    });
  }

  /**
   * Assign rubric to assignment
   */
  async assignRubric(id: number, rubricId: number | null) {
    return this.prisma.assignment.update({
      where: { id },
      data: { rubricId },
    });
  }

  /**
   * Get PDF file path for assignment
   */
  getPdfPath(assignmentId: number): string {
    return join(this.uploadsDir, `instructions_${assignmentId}.pdf`);
  }

  /**
   * Check if PDF exists for assignment
   * Matching Phoenix pdf_exists? function
   */
  pdfExists(assignmentId: number): boolean {
    return existsSync(this.getPdfPath(assignmentId));
  }

  /**
   * Save PDF for assignment
   */
  savePdf(assignmentId: number, buffer: Buffer) {
    writeFileSync(this.getPdfPath(assignmentId), buffer);
  }

  /**
   * Delete PDF for assignment
   */
  deletePdf(assignmentId: number) {
    const path = this.getPdfPath(assignmentId);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
