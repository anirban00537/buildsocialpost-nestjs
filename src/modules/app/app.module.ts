import { Module, NestModule, RequestMethod } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { MailConfig } from 'src/shared/configs/mail.config';
import { UsersModule } from '../users/users.module';
import { MailModule } from 'src/shared/mail/mail.module';
import { ApiSecretCheckMiddleware } from 'src/shared/middlewares/apisecret.middleware';
import { coreConstant } from 'src/shared/helpers/coreConstant';
import { SettingsModule } from '../admin/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [MailConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MailModule,
    SettingsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiSecretCheckMiddleware)
      .exclude({
        path: `/${coreConstant.FILE_DESTINATION}/*`,
        method: RequestMethod.ALL,
      })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
