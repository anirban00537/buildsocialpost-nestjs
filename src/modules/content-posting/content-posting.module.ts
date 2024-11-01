import { Module } from '@nestjs/common';
import { ContentPostingController } from './content-posting.controller';
import { ContentPostingService } from './content-posting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContentPostingController],
  providers: [ContentPostingService],
  exports: [ContentPostingService],
})
export class ContentPostingModule {}
