import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { CoursesService, CreateCourseDto, UpdateCourseDto } from './courses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Get all courses for the current teacher
   */
  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: "List teacher's courses" })
  async findAll(@CurrentUser() user: User) {
    return this.coursesService.findByTeacher(user.id);
  }

  /**
   * Get course by ID with all relations
   */
  @Get(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get course details with sections, rubrics, assignments' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.coursesService.verifyAccess(id, user);
    return this.coursesService.findById(id);
  }

  /**
   * Create a new course
   */
  @Post()
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new course' })
  async create(@Body() dto: CreateCourseDto, @CurrentUser() user: User) {
    return this.coursesService.create(user.id, dto);
  }

  /**
   * Update course
   */
  @Put(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Update course' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(id, user);
    return this.coursesService.update(id, dto);
  }

  /**
   * Delete course
   */
  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete course (cascades to all related data)' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.coursesService.verifyAccess(id, user);
    return this.coursesService.delete(id);
  }
}
