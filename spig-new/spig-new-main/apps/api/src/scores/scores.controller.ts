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
import { User, SectionStatus, Role } from '@prisma/client';
import { ScoresService, CreateScoreDto } from './scores.service';
import { SectionsService } from '../sections/sections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('scores')
@Controller('sections/:sectionId/scores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ScoresController {
  constructor(
    private readonly scoresService: ScoresService,
    private readonly sectionsService: SectionsService,
  ) {}

  /**
   * Submit individual score
   */
  @Post()
  @ApiOperation({ summary: 'Submit individual score' })
  async createIndividual(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @Body() dto: CreateScoreDto,
    @CurrentUser() user: User,
  ) {
    // Verify membership or teacher
    const section = await this.sectionsService.findById(sectionId);
    const isTeacher = section.teacherId === user.id || user.role === Role.ADMIN;
    const isMember = await this.sectionsService.isMember(sectionId, user.id);

    if (!isTeacher && !isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    // Verify section is in individual grading status (or teacher grading)
    if (!isTeacher && section.status !== SectionStatus.GRADING_INDIVIDUAL) {
      throw new BadRequestException('Individual grading is not currently open');
    }

    return this.scoresService.createIndividual(user.id, dto);
  }

  /**
   * Get current group score
   */
  @Get('group')
  @ApiOperation({ summary: 'Get current group score for grading' })
  async getGroupScore(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
  ) {
    // Verify membership
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    const section = await this.sectionsService.findById(sectionId);

    if (section.status !== SectionStatus.GRADING_GROUPS) {
      throw new BadRequestException('Group grading is not currently open');
    }

    // Get user's group
    const members = await this.sectionsService.getMembers(sectionId);
    const membership = members.find((m) => m.user.id === user.id);

    if (!membership?.groupId) {
      throw new BadRequestException('Not assigned to a group');
    }

    // This would need the current submission ID - typically passed from frontend
    // or fetched via submissions service
    return { groupId: membership.groupId };
  }
}
