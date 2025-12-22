import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Section, SectionStatus, User, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Status order matching Phoenix state machine
const STATUS_ORDER: SectionStatus[] = [
  SectionStatus.WAITING,
  SectionStatus.WRITING,
  SectionStatus.GRADING_INDIVIDUAL,
  SectionStatus.GRADING_GROUPS,
  SectionStatus.VIEWING_RESULTS,
];

export interface CreateSectionDto {
  name: string;
  year: number;
  semester: string;
}

export interface UpdateSectionDto {
  name?: string;
  year?: number;
  semester?: string;
  archived?: boolean;
}

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique joinable code (matching Phoenix behavior)
   * Uses 12 bytes of random data encoded as URL-safe base64
   */
  generateJoinableCode(): string {
    return randomBytes(12).toString('base64url');
  }

  /**
   * Find sections a student is enrolled in
   */
  async findByStudent(userId: number) {
    return this.prisma.section.findMany({
      where: {
        memberships: {
          some: { userId },
        },
        archived: false,
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true },
        },
        assignment: {
          select: { id: true, name: true },
        },
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find section by ID with full relations for student view
   */
  async findById(id: number) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true, email: true },
        },
        assignment: {
          include: {
            rubric: {
              include: {
                criteria: {
                  orderBy: { id: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  /**
   * Find section by joinable code (for join page)
   */
  async findByJoinableCode(code: string) {
    const section = await this.prisma.section.findUnique({
      where: { joinableCode: code },
      include: {
        course: {
          select: { id: true, name: true },
        },
        teacher: {
          select: { id: true, name: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Invalid join code');
    }

    return section;
  }

  /**
   * Create a new section
   */
  async create(courseId: number, teacherId: number, data: CreateSectionDto) {
    return this.prisma.section.create({
      data: {
        name: data.name,
        year: data.year,
        semester: data.semester,
        joinableCode: this.generateJoinableCode(),
        status: SectionStatus.WAITING,
        linkActive: false,
        courseId,
        teacherId,
      },
    });
  }

  /**
   * Update section
   */
  async update(id: number, data: UpdateSectionDto) {
    return this.prisma.section.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete section
   */
  async delete(id: number) {
    return this.prisma.section.delete({
      where: { id },
    });
  }

  /**
   * Toggle join link activation
   */
  async toggleLink(id: number) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      select: { linkActive: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return this.prisma.section.update({
      where: { id },
      data: { linkActive: !section.linkActive },
    });
  }

  /**
   * Regenerate joinable code
   */
  async regenerateCode(id: number) {
    return this.prisma.section.update({
      where: { id },
      data: { joinableCode: this.generateJoinableCode() },
    });
  }

  /**
   * Join section (student)
   */
  async join(code: string, userId: number) {
    const section = await this.findByJoinableCode(code);

    if (!section.linkActive) {
      throw new ForbiddenException('Join link is not active');
    }

    // Check if already a member
    const existingMembership = await this.prisma.sectionMembership.findUnique({
      where: {
        userId_sectionId: {
          userId,
          sectionId: section.id,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Already a member of this section');
    }

    // Create membership
    await this.prisma.sectionMembership.create({
      data: {
        userId,
        sectionId: section.id,
      },
    });

    return section;
  }

  /**
   * Check if user is a member of section
   */
  async isMember(sectionId: number, userId: number): Promise<boolean> {
    const membership = await this.prisma.sectionMembership.findUnique({
      where: {
        userId_sectionId: {
          userId,
          sectionId,
        },
      },
    });
    return !!membership;
  }

  /**
   * Set active assignment for section
   */
  async setAssignment(sectionId: number, assignmentId: number | null) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { status: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Can only set assignment when status is WAITING
    if (assignmentId !== null && section.status !== SectionStatus.WAITING) {
      throw new BadRequestException('Can only set assignment when section is in WAITING status');
    }

    return this.prisma.section.update({
      where: { id: sectionId },
      data: { assignmentId },
    });
  }

  /**
   * Update section status (state machine)
   */
  async updateStatus(sectionId: number, newStatus: SectionStatus) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { status: true, assignmentId: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Validate transition
    if (!this.canTransition(section.status, newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${section.status} to ${newStatus}`,
      );
    }

    // Must have assignment set to progress beyond WAITING
    if (newStatus !== SectionStatus.WAITING && !section.assignmentId) {
      throw new BadRequestException('Must set an assignment before progressing');
    }

    return this.prisma.section.update({
      where: { id: sectionId },
      data: { status: newStatus },
    });
  }

  /**
   * End activity (reset to WAITING and clear assignment)
   */
  async endActivity(sectionId: number) {
    return this.prisma.section.update({
      where: { id: sectionId },
      data: {
        status: SectionStatus.WAITING,
        assignmentId: null,
      },
    });
  }

  /**
   * Check if status transition is valid (only allows +1 or -1 step)
   */
  canTransition(current: SectionStatus, next: SectionStatus): boolean {
    const currentIndex = STATUS_ORDER.indexOf(current);
    const nextIndex = STATUS_ORDER.indexOf(next);

    // Allow moving one step forward or backward
    return Math.abs(nextIndex - currentIndex) === 1;
  }

  /**
   * Get next valid status in sequence
   */
  getNextStatus(current: SectionStatus): SectionStatus | null {
    const currentIndex = STATUS_ORDER.indexOf(current);
    if (currentIndex < STATUS_ORDER.length - 1) {
      return STATUS_ORDER[currentIndex + 1];
    }
    return null;
  }

  /**
   * Get previous status in sequence
   */
  getPreviousStatus(current: SectionStatus): SectionStatus | null {
    const currentIndex = STATUS_ORDER.indexOf(current);
    if (currentIndex > 0) {
      return STATUS_ORDER[currentIndex - 1];
    }
    return null;
  }

  /**
   * Get all members of a section
   */
  async getMembers(sectionId: number) {
    return this.prisma.sectionMembership.findMany({
      where: { sectionId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        group: {
          select: { id: true },
        },
      },
    });
  }

  /**
   * Check if user has access to section (is teacher/admin or member)
   */
  async hasAccess(sectionId: number, user: User): Promise<boolean> {
    if (user.role === Role.ADMIN) {
      return true;
    }

    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { teacherId: true },
    });

    if (section?.teacherId === user.id) {
      return true;
    }

    return this.isMember(sectionId, user.id);
  }

  /**
   * Delete all submissions for a section's current assignment
   */
  async deleteSubmissions(sectionId: number) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { assignmentId: true },
    });

    if (!section?.assignmentId) {
      throw new BadRequestException('No assignment set for this section');
    }

    // Get all member IDs
    const memberships = await this.prisma.sectionMembership.findMany({
      where: { sectionId },
      select: { userId: true },
    });
    const memberIds = memberships.map((m) => m.userId);

    // Delete submissions for this assignment from section members
    return this.prisma.submission.deleteMany({
      where: {
        assignmentId: section.assignmentId,
        studentId: { in: memberIds },
      },
    });
  }
}
