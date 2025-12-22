import { Module, forwardRef } from '@nestjs/common';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { ScoresGateway } from './scores.gateway';
import { SectionsModule } from '../sections/sections.module';
import { RubricsModule } from '../rubrics/rubrics.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => SectionsModule),
    RubricsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ScoresController],
  providers: [ScoresService, ScoresGateway],
  exports: [ScoresService, ScoresGateway],
})
export class ScoresModule {}
