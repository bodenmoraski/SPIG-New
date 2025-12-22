import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { User, SectionStatus } from '@prisma/client';
import { SubmissionsService, CreateSubmissionDto } from './submissions.service';
import { SectionsService } from '../sections/sections.service';
import { SectionsGateway } from '../sections/sections.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('submissions')
@Controller('sections/:sectionId/submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly sectionsService: SectionsService,
    private readonly sectionsGateway: SectionsGateway,
  ) {}

  /**
   * Create submission
   */
  @Post()
  @ApiOperation({ summary: 'Submit code for grading' })
  async create(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: User,
  ) {
    // Verify membership
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    // Get section with assignment
    const section = await this.sectionsService.findById(sectionId);

    // Verify section is in WRITING status
    if (section.status !== SectionStatus.WRITING) {
      throw new BadRequestException('Submissions are not currently open');
    }

    if (!section.assignmentId) {
      throw new BadRequestException('No active assignment');
    }

    const submission = await this.submissionsService.create(
      user.id,
      section.assignmentId,
      dto.value,
    );

    // Notify teacher via WebSocket
    this.sectionsGateway.emitSubmissionReceived(sectionId, {
      id: submission.id,
      studentId: user.id,
    });

    return submission;
  }

  /**
   * Get current user's submission
   */
  @Get('mine')
  @ApiOperation({ summary: "Get current user's submission" })
  async getMine(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
  ) {
    const section = await this.sectionsService.findById(sectionId);

    if (!section.assignmentId) {
      return null;
    }

    return this.submissionsService.findByUserAndAssignment(user.id, section.assignmentId);
  }

  /**
   * Get next ungraded submission (for individual grading)
   */
  @Get('next')
  @ApiOperation({ summary: 'Get next submission to grade' })
  async getNext(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
  ) {
    // Verify membership
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    const section = await this.sectionsService.findById(sectionId);

    if (!section.assignmentId) {
      return null;
    }

    // Different logic based on grading mode
    if (section.status === SectionStatus.GRADING_INDIVIDUAL) {
      return this.submissionsService.getNextForIndividual(user.id, section.assignmentId);
    }

    if (section.status === SectionStatus.GRADING_GROUPS) {
      // Get user's group
      const members = await this.sectionsService.getMembers(sectionId);
      const membership = members.find((m) => m.user.id === user.id);

      if (!membership?.groupId) {
        throw new BadRequestException('Not assigned to a group');
      }

      return this.submissionsService.getNextForGroup(
        membership.groupId,
        section.assignmentId,
        sectionId,
      );
    }

    throw new BadRequestException('Section is not in a grading phase');
  }
}
