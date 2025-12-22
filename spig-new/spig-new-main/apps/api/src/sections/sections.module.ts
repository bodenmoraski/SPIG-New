import { Module, forwardRef } from '@nestjs/common';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { SectionsGateway } from './sections.gateway';
import { CoursesModule } from '../courses/courses.module';
import { GroupsModule } from '../groups/groups.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, forwardRef(() => GroupsModule), forwardRef(() => AuthModule)],
  controllers: [SectionsController],
  providers: [SectionsService, SectionsGateway],
  exports: [SectionsService, SectionsGateway],
})
export class SectionsModule {}
