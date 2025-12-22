import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { Role, User, SectionStatus } from '@prisma/client';
import { SectionsService, CreateSectionDto, UpdateSectionDto } from './sections.service';
import { CoursesService } from '../courses/courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SectionsGateway } from './sections.gateway';

@ApiTags('sections')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class SectionsController {
  constructor(
    private readonly sectionsService: SectionsService,
    private readonly coursesService: CoursesService,
    private readonly sectionsGateway: SectionsGateway,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // STUDENT ROUTES
  // ============================================================================

  /**
   * Get enrolled sections for current student
   */
  @Get('sections')
  @ApiOperation({ summary: "List student's enrolled sections" })
  async getEnrolledSections(@CurrentUser() user: User) {
    return this.sectionsService.findByStudent(user.id);
  }

  /**
   * Get section info for join page
   */
  @Get('sections/join/:code')
  @ApiOperation({ summary: 'Get section info for join page' })
  async getJoinInfo(@Param('code') code: string) {
    const section = await this.sectionsService.findByJoinableCode(code);
    return {
      id: section.id,
      name: section.name,
      course: section.course,
      teacher: section.teacher,
      linkActive: section.linkActive,
    };
  }

  /**
   * Join section via code
   */
  @Post('sections/join/:code')
  @ApiOperation({ summary: 'Join section via code' })
  async joinSection(@Param('code') code: string, @CurrentUser() user: User) {
    const section = await this.sectionsService.join(code, user.id);

    // Broadcast join event to teacher management view
    this.sectionsGateway.emitStudentJoined(section.id, user);

    return { success: true, sectionId: section.id };
  }

  /**
   * Get section details (student view)
   */
  @Get('sections/:id')
  @ApiOperation({ summary: 'Get section details' })
  @ApiQuery({ name: 'student_view', required: false, description: 'Force student view for teachers' })
  async getSection(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Query('student_view') studentView?: string,
  ) {
    const section = await this.sectionsService.findById(id);
    const isTeacher = section.teacherId === user.id || user.role === Role.ADMIN;
    const isMember = await this.sectionsService.isMember(id, user.id);

    if (!isTeacher && !isMember) {
      throw new ForbiddenException('Access denied');
    }

    // If teacher viewing as student, force certain status for preview
    const viewAsTeacher = isTeacher && studentView !== '1';

    return {
      ...section,
      isTeacher: viewAsTeacher,
    };
  }

  // ============================================================================
  // TEACHER ROUTES (under /courses/:courseId)
  // ============================================================================

  /**
   * List sections for a course
   */
  @Get('courses/:courseId/sections')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'List course sections' })
  async listCourseSections(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    return this.sectionsService.findByStudent(user.id); // This needs to be findByCourse
  }

  /**
   * Create section
   */
  @Post('courses/:courseId/sections')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Create section' })
  async createSection(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.create(courseId, user.id, dto);

    // Broadcast new section event
    this.sectionsGateway.emitNewSection(courseId, section);

    return section;
  }

  /**
   * Get section management details
   */
  @Get('courses/:courseId/sections/:secId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get section management details' })
  async getSectionManagement(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.findById(secId);
    const members = await this.sectionsService.getMembers(secId);

    return {
      ...section,
      members,
    };
  }

  /**
   * Update section
   */
  @Put('courses/:courseId/sections/:secId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Update section' })
  async updateSection(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.sectionsService.update(secId, dto);
  }

  /**
   * Delete section
   */
  @Delete('courses/:courseId/sections/:secId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete section' })
  async deleteSection(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.sectionsService.delete(secId);
  }

  /**
   * Toggle join link
   */
  @Put('courses/:courseId/sections/:secId/link')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Toggle join link activation' })
  async toggleLink(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.toggleLink(secId);

    // Broadcast link toggle event
    this.sectionsGateway.emitLinkToggled(section.joinableCode, section.linkActive);

    return section;
  }

  /**
   * Regenerate join code
   */
  @Post('courses/:courseId/sections/:secId/link/regenerate')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Regenerate join code' })
  async regenerateCode(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.sectionsService.regenerateCode(secId);
  }

  /**
   * Set active assignment
   */
  @Post('courses/:courseId/sections/:secId/assignment')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Set active assignment' })
  async setAssignment(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @Body() dto: { assignmentId: number },
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.setAssignment(secId, dto.assignmentId);

    // Broadcast section update
    this.sectionsGateway.emitSectionUpdated(secId, section);

    return section;
  }

  /**
   * End activity (clear assignment, reset to WAITING)
   */
  @Delete('courses/:courseId/sections/:secId/assignment')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'End activity' })
  async endActivity(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.endActivity(secId);

    // Broadcast section update
    this.sectionsGateway.emitSectionUpdated(secId, section);

    return section;
  }

  /**
   * Update section status
   */
  @Post('courses/:courseId/sections/:secId/status')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Change section status' })
  async updateStatus(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @Body() dto: { status: SectionStatus },
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const section = await this.sectionsService.updateStatus(secId, dto.status);

    // Broadcast section update to all students
    this.sectionsGateway.emitSectionUpdated(secId, section);

    return section;
  }

  /**
   * Delete all submissions
   */
  @Delete('courses/:courseId/sections/:secId/submissions')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete all submissions for current assignment' })
  async deleteSubmissions(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.sectionsService.deleteSubmissions(secId);
  }

  /**
   * Get user's group info
   */
  @Get('sections/:id/group')
  @ApiOperation({ summary: "Get current user's group info" })
  async getGroupInfo(
    @Param('id', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
  ) {
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    const members = await this.sectionsService.getMembers(sectionId);
    const membership = members.find((m) => m.user.id === user.id);

    if (!membership?.groupId) {
      throw new ForbiddenException('Not assigned to a group');
    }

    // Get all members of the same group
    const groupMembers = members
      .filter((m) => m.groupId === membership.groupId)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      }));

    return {
      groupId: membership.groupId,
      members: groupMembers,
    };
  }

}
