import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { API_PREFIX } from './shared/constants/global.constants';
import { setApp } from './shared/helpers/functions';
import { NestExpressApplication } from '@nestjs/platform-express';
import { coreConstant } from './shared/helpers/coreConstant';
import { MyLogger } from './modules/logger/logger.service';
import { AppModule } from './modules/app/app.module';
import express from 'express';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
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

  const staticAssetsPath = path.join(
    __dirname,
    '..',
    '..',
    coreConstant.FILE_DESTINATION,
  );
  console.log('Full static assets path:', staticAssetsPath);
  console.log(
    'Static assets serve prefix:',
    `/${coreConstant.FILE_DESTINATION}/`,
  );

  app.useStaticAssets(staticAssetsPath, {
    prefix: `/${coreConstant.FILE_DESTINATION}/`,
  });
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

  // Use MyLogger
  const logger = app.get(MyLogger);
  app.useLogger(logger);

  app.enableCors({
    origin: ['https://buildsocialpost.com', 'http://localhost:3000'], // Add any other origins you need
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(configService.get('APP_PORT') || 3001);
}
bootstrap();
