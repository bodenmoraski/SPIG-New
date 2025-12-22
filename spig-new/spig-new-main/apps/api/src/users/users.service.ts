import { Injectable } from '@nestjs/common';
import { User, Role, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserDto {
  email: string;
  name: string;
  avatar?: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  avatar?: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email (case-insensitive due to citext)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create new user
   */
  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        role: data.role ?? Role.STUDENT,
      },
    });
  }

  /**
   * Update user
   */
  async update(id: number, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: Role): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: User): boolean {
    return user.role === Role.ADMIN;
  }

  /**
   * Check if user is teacher or admin
   */
  isTeacherOrAdmin(user: User): boolean {
    return user.role === Role.TEACHER || user.role === Role.ADMIN;
  }
}
