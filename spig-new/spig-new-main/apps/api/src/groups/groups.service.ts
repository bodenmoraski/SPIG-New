import { Injectable } from '@nestjs/common';
import { Group, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate groups for a section
   * Matching Phoenix generate_groups function
   */
  async generateGroups(sectionId: number, perGroup = 5) {
    // 1. Get all student IDs in section
    const memberships = await this.prisma.sectionMembership.findMany({
      where: { sectionId },
      select: { userId: true },
    });

    const studentIds = memberships.map((m) => m.userId);

    // 2. Shuffle randomly (Fisher-Yates)
    const shuffled = [...studentIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Calculate number of groups
    const ngroups = Math.ceil(shuffled.length / perGroup);

    // 4. Create groups
    const groups: Group[] = [];
    for (let i = 0; i < ngroups; i++) {
      const group = await this.prisma.group.create({
        data: { sectionId },
      });
      groups.push(group);
    }

    // 5. Assign students to groups
    const chunks = this.chunkArray(shuffled, perGroup);
    for (let i = 0; i < chunks.length; i++) {
      const group = groups[i];
      const students = chunks[i];

      await this.prisma.sectionMembership.updateMany({
        where: {
          sectionId,
          userId: { in: students },
        },
        data: { groupId: group.id },
      });
    }

    return groups;
  }

  /**
   * Get group by ID with members
   */
  async findById(id: number) {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get user's group in a section
   */
  async findUserGroup(sectionId: number, userId: number) {
    const membership = await this.prisma.sectionMembership.findUnique({
      where: {
        userId_sectionId: {
          userId,
          sectionId,
        },
      },
      include: {
        group: {
          include: {
            memberships: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    return membership?.group ?? null;
  }

  /**
   * Get all groups for a section
   */
  async findBySectionId(sectionId: number) {
    return this.prisma.group.findMany({
      where: { sectionId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { scores: { where: { done: true } } },
        },
      },
    });
  }

  /**
   * Delete all groups for a section
   */
  async deleteBySection(sectionId: number) {
    // First clear group_id from memberships
    await this.prisma.sectionMembership.updateMany({
      where: { sectionId },
      data: { groupId: null },
    });

    // Then delete groups
    return this.prisma.group.deleteMany({
      where: { sectionId },
    });
  }

  /**
   * Helper to chunk array into groups
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Build group members display string
   * Matching Phoenix group_members logic
   */
  buildGroupMembersString(members: { user: { name: string; id: number } }[], currentUserId: number): string {
    const otherMembers = members.filter((m) => m.user.id !== currentUserId);
    const n = otherMembers.length;

    if (n === 0) return '';
    if (n === 1) return otherMembers[0].user.name;

    return otherMembers.reduce((acc, member, i) => {
      if (i === 0) return member.user.name;
      if (i === n - 1) return `${acc}, and ${member.user.name}`;
      return `${acc}, ${member.user.name}`;
    }, '');
  }
}
