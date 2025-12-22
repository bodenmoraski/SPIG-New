import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Course, User, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCourseDto {
  name: string;
}

export interface UpdateCourseDto {
  name?: string;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all courses for a teacher
   */
  async findByTeacher(teacherId: number) {
    return this.prisma.course.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: {
            sections: true,
            rubrics: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find course by ID with full relations
   */
  async findById(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { memberships: true } },
          },
        },
        rubrics: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { criteria: true } },
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            rubric: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  /**
   * Create a new course
   */
  async create(teacherId: number, data: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        name: data.name,
        teacherId,
      },
      include: {
        _count: {
          select: {
            sections: true,
            rubrics: true,
            assignments: true,
          },
        },
      },
    });
  }

  /**
   * Update course
   */
  async update(id: number, data: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete course (cascades to sections, assignments, etc.)
   */
  async delete(id: number) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  /**
   * Check if user has access to course (is owner or admin)
   * Matching Phoenix has_access_to_course behavior
   */
  async hasAccess(courseId: number, user: User): Promise<boolean> {
    // Admin bypasses all checks
    if (user.role === Role.ADMIN) {
      return true;
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    return course?.teacherId === user.id;
  }

  /**
   * Verify access and throw if denied
   */
  async verifyAccess(courseId: number, user: User): Promise<void> {
    const hasAccess = await this.hasAccess(courseId, user);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this course');
    }
  }
}
