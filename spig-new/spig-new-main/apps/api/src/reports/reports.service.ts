import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GradeCalculator, ReportData } from './grade-calculator';
import { ScoresService } from '../scores/scores.service';
import { RubricsService } from '../rubrics/rubrics.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradeCalculator: GradeCalculator,
    private readonly scoresService: ScoresService,
    private readonly rubricsService: RubricsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  /**
   * Generate report for a section's current assignment
   */
  async generateReport(sectionId: number) {
    // Get section with assignment and rubric
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        assignment: {
          include: {
            rubric: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    if (!section.assignment || !section.assignment.rubric) {
      throw new NotFoundException('No assignment or rubric configured');
    }

    const assignmentId = section.assignment.id;
    const rubricId = section.assignment.rubric.id;
    const criteria = section.assignment.rubric.criteria;

    // Get all submissions for this section
    const submissions = await this.submissionsService.findByAssignmentAndSection(
      assignmentId,
      sectionId,
    );

    const studentIds = submissions.map((s) => s.studentId);

    // Get all scores for this assignment
    const scores = await this.scoresService.getScoresForAssignment(assignmentId);

    // Convert scores to percentage format for grade calculation
    const scoreData = scores.map((score) => {
      const evaluation = score.evaluation as Record<string, boolean>;
      const percentage = this.rubricsService.calculatePercentage(criteria, evaluation);

      return {
        studentId: score.submission.studentId,
        scorerId: score.scorerId,
        groupId: score.groupId,
        percentage,
        isTeacher: score.scorer?.role === Role.TEACHER || score.scorer?.role === Role.ADMIN,
      };
    });

    // Generate report
    const reportData = this.gradeCalculator.generateReport(studentIds, scoreData);

    // Get latest report version
    const latestReport = await this.prisma.report.findFirst({
      where: {
        sectionId,
        assignmentId,
      },
      orderBy: { reportVersion: 'desc' },
      select: { reportVersion: true },
    });

    const newVersion = (latestReport?.reportVersion ?? 0) + 1;

    // Save report
    const report = await this.prisma.report.create({
      data: {
        assignmentId,
        sectionId,
        rubricId,
        reportVersion: newVersion,
        report: reportData as any,
      },
    });

    return report;
  }

  /**
   * Get latest report for a section
   */
  async getLatestReport(sectionId: number, assignmentId?: number) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { assignmentId: true },
    });

    const targetAssignmentId = assignmentId ?? section?.assignmentId;

    if (!targetAssignmentId) {
      return null;
    }

    return this.prisma.report.findFirst({
      where: {
        sectionId,
        assignmentId: targetAssignmentId,
      },
      orderBy: { reportVersion: 'desc' },
    });
  }

  /**
   * Get student's results from report
   */
  async getStudentResults(sectionId: number, userId: number) {
    const report = await this.getLatestReport(sectionId);

    if (!report) {
      return null;
    }

    const reportData = report.report as unknown as ReportData;
    const studentGrades = reportData[String(userId)];

    if (!studentGrades) {
      return null;
    }

    return {
      grades: studentGrades,
      classStats: reportData.class,
      version: reportData.version,
      generatedAt: report.createdAt,
    };
  }

  /**
   * Get all reports for a section
   */
  async getReportHistory(sectionId: number) {
    return this.prisma.report.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reportVersion: true,
        createdAt: true,
        assignment: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
