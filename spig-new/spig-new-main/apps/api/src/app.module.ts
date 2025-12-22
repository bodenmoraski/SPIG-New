import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { SectionsModule } from './sections/sections.module';
import { RubricsModule } from './rubrics/rubrics.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ScoresModule } from './scores/scores.module';
import { GroupsModule } from './groups/groups.module';
import { ReportsModule } from './reports/reports.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    SectionsModule,
    RubricsModule,
    AssignmentsModule,
    SubmissionsModule,
    ScoresModule,
    GroupsModule,
    ReportsModule,
    GatewayModule,
  ],
})
export class AppModule {}
