import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { accessJwtConfig } from 'src/shared/configs/jwt.config';
import { PrismaModule } from '../prisma/prisma.module';
import { AccessJwtStrategy } from './strategy/access.jwt.strategy';
import { UserVerificationCodeService } from '../verification_code/user-verify-code.service';
// import { LocalStrategy } from "src/common/strategy/local.strategy";

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: accessJwtConfig.secret,
      signOptions: { expiresIn: accessJwtConfig.expiresIn },
    }),
  ],
  providers: [AuthService, AccessJwtStrategy, UserVerificationCodeService],
  controllers: [AuthController],
})
export class AuthModule {}
