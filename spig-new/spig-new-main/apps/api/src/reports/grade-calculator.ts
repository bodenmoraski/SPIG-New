import { Injectable } from '@nestjs/common';

/**
 * Grade calculation service
 * Ported from Phoenix python_data/data.py
 */

export interface StudentGrades {
  teacher_only: number | null;
  students_only: number | null;
  groups_only: number | null;
  total_average: number | null;
  weighted_average: number | null;
  highest: number | null;
  lowest: number | null;
  median: number | null;
}

export interface ClassStatistics {
  median: number | null;
  highest: number | null;
  lowest: number | null;
}

export interface ReportData {
  [studentId: string]: StudentGrades | ClassStatistics | number;
  class: ClassStatistics;
  version: number;
}

@Injectable()
export class GradeCalculator {
  /**
   * Safe mean calculation (returns null for empty arrays)
   */
  smean(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Safe max calculation
   */
  smax(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return Math.max(...arr);
  }

  /**
   * Safe min calculation
   */
  smin(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    return Math.min(...arr);
  }

  /**
   * Safe median calculation
   */
  smedian(arr: number[]): number | null {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate all grade types for a student
   * Matching Phoenix data.py finalGradeFormulas
   */
  calculateStudentGrades(
    teacherGrade: number | null,
    peerGrades: number[],
    groupGrades: number[],
  ): StudentGrades {
    const studentsOnly = this.smean(peerGrades);
    const groupsOnly = this.smean(groupGrades);

    // All grades for statistics
    const allGrades: number[] = [];
    if (teacherGrade !== null) allGrades.push(teacherGrade);
    allGrades.push(...peerGrades);
    allGrades.push(...groupGrades);

    // Calculate averages
    let totalAverage: number | null = null;
    let weightedAverage: number | null = null;

    const validGrades: number[] = [];
    if (teacherGrade !== null) validGrades.push(teacherGrade);
    if (studentsOnly !== null) validGrades.push(studentsOnly);
    if (groupsOnly !== null) validGrades.push(groupsOnly);

    if (validGrades.length > 0) {
      totalAverage = this.smean(validGrades);
    }

    // Weighted average: 40% teacher, 30% students, 30% groups
    if (teacherGrade !== null && studentsOnly !== null && groupsOnly !== null) {
      weightedAverage = 0.4 * teacherGrade + 0.3 * studentsOnly + 0.3 * groupsOnly;
    } else if (teacherGrade !== null && studentsOnly !== null) {
      weightedAverage = 0.5 * teacherGrade + 0.5 * studentsOnly;
    } else if (teacherGrade !== null && groupsOnly !== null) {
      weightedAverage = 0.5 * teacherGrade + 0.5 * groupsOnly;
    } else if (studentsOnly !== null && groupsOnly !== null) {
      weightedAverage = 0.5 * studentsOnly + 0.5 * groupsOnly;
    } else if (teacherGrade !== null) {
      weightedAverage = teacherGrade;
    } else if (studentsOnly !== null) {
      weightedAverage = studentsOnly;
    } else if (groupsOnly !== null) {
      weightedAverage = groupsOnly;
    }

    return {
      teacher_only: teacherGrade,
      students_only: studentsOnly,
      groups_only: groupsOnly,
      total_average: totalAverage !== null ? Math.round(totalAverage * 100) / 100 : null,
      weighted_average: weightedAverage !== null ? Math.round(weightedAverage * 100) / 100 : null,
      highest: this.smax(allGrades),
      lowest: this.smin(allGrades),
      median: this.smedian(allGrades),
    };
  }

  /**
   * Calculate class-wide statistics
   */
  calculateClassStatistics(allWeightedAverages: number[]): ClassStatistics {
    return {
      median: this.smedian(allWeightedAverages),
      highest: this.smax(allWeightedAverages),
      lowest: this.smin(allWeightedAverages),
    };
  }

  /**
   * Generate full report from score data
   */
  generateReport(
    studentIds: number[],
    scoreData: {
      studentId: number;
      scorerId: number | null;
      groupId: number | null;
      percentage: number;
      isTeacher: boolean;
    }[],
  ): ReportData {
    const report: ReportData = {
      class: { median: null, highest: null, lowest: null },
      version: 1,
    };

    const allWeightedAverages: number[] = [];

    for (const studentId of studentIds) {
      // Get all scores for this student's submission
      const studentScores = scoreData.filter((s) => s.studentId === studentId);

      // Separate by type
      const teacherScores = studentScores.filter((s) => s.isTeacher);
      const peerScores = studentScores.filter((s) => !s.isTeacher && !s.groupId);
      const groupScores = studentScores.filter((s) => !s.isTeacher && s.groupId);

      const teacherGrade = teacherScores.length > 0 ? teacherScores[0].percentage : null;
      const peerGrades = peerScores.map((s) => s.percentage);
      const groupGrades = groupScores.map((s) => s.percentage);

      const grades = this.calculateStudentGrades(teacherGrade, peerGrades, groupGrades);
      report[String(studentId)] = grades;

      if (grades.weighted_average !== null) {
        allWeightedAverages.push(grades.weighted_average);
      }
    }

    report.class = this.calculateClassStatistics(allWeightedAverages);

    return report;
  }
}
