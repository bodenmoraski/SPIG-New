import { Module } from '@nestjs/common';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [CoursesModule],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService],
})
export class RubricsModule {}
