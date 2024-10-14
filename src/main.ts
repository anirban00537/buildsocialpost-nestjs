import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './modules/app/app.module';
import { API_PREFIX } from './shared/constants/global.constants';
import { setApp } from './shared/helpers/functions';
import { NestExpressApplication } from '@nestjs/platform-express';
import { coreConstant } from './shared/helpers/coreConstant';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  setApp(app);
  app.setGlobalPrefix(API_PREFIX);
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  );
  app.use(cookieParser());

  app.useStaticAssets(
    path.join(__dirname, `../../${coreConstant.FILE_DESTINATION}`),
    {
      prefix: `/${coreConstant.FILE_DESTINATION}`,
    },
  );
  // setApp(app);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  console.log(
    'Static assets directory:',
    path.join(__dirname, `../../${coreConstant.FILE_DESTINATION}`),
  );
  console.log('Serving at:', `/${coreConstant.FILE_DESTINATION}`);
  await app.listen(configService.get('APP_PORT') || 3001);
}
bootstrap();
