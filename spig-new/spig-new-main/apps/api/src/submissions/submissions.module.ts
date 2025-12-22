import { Module, forwardRef } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SectionsModule } from '../sections/sections.module';

@Module({
  imports: [forwardRef(() => SectionsModule)],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
