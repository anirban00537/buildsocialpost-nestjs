import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserController } from './users.controller';
import { UserVerificationCodeService } from '../verification_code/user-verify-code.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationService } from 'src/shared/notification/notification.service';

@Module({
  controllers: [UserController],
  providers: [UsersService, UserVerificationCodeService, NotificationService],
  imports: [PrismaModule],
  exports: [UsersService],
})
export class UsersModule {}

