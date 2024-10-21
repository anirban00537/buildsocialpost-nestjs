import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionService } from '../subscription/subscription.service';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [FileController],
  providers: [FileService, SubscriptionService],
})
export class FileModule {}
