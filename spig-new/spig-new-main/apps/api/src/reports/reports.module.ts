import { Module, forwardRef } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GradeCalculator } from './grade-calculator';
import { ScoresModule } from '../scores/scores.module';
import { SectionsModule } from '../sections/sections.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { CoursesModule } from '../courses/courses.module';
import { RubricsModule } from '../rubrics/rubrics.module';

@Module({
  imports: [
    CoursesModule,
    forwardRef(() => SectionsModule),
    forwardRef(() => ScoresModule),
    SubmissionsModule,
    RubricsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, GradeCalculator],
  exports: [ReportsService],
})
export class ReportsModule {}
