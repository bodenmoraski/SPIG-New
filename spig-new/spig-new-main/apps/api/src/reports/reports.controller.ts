import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CoursesService } from '../courses/courses.service';
import { SectionsService } from '../sections/sections.service';
import { SectionsGateway } from '../sections/sections.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reports')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly sectionsGateway: SectionsGateway,
  ) {}

  /**
   * Generate report (teacher only)
   */
  @Post('courses/:courseId/sections/:secId/reports')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Generate grade report' })
  async generateReport(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    const report = await this.reportsService.generateReport(secId);

    // Broadcast report generated to students
    this.sectionsGateway.emitReportGenerated(secId, {
      id: report.id,
      version: report.reportVersion,
      generatedAt: report.createdAt,
    });

    return report;
  }

  /**
   * Get latest report (teacher only - sees all)
   */
  @Get('courses/:courseId/sections/:secId/reports')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get latest report with all student grades' })
  async getReport(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.reportsService.getLatestReport(secId);
  }

  /**
   * Get report history
   */
  @Get('courses/:courseId/sections/:secId/reports/history')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get report generation history' })
  async getReportHistory(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('secId', ParseIntPipe) secId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.reportsService.getReportHistory(secId);
  }

  /**
   * Get student's own results
   */
  @Get('sections/:sectionId/results')
  @ApiOperation({ summary: "Get current student's results" })
  async getStudentResults(
    @Param('sectionId', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
  ) {
    // Verify membership
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this section');
    }

    return this.reportsService.getStudentResults(sectionId, user.id);
  }
}
