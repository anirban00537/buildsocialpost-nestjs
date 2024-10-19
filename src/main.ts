import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
  setApp(app);
  app.setGlobalPrefix(API_PREFIX);

  // Enable CORS for all origins
  app.enableCors({
    origin: '*', // This allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const rawBodyBuffer = (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  };

  app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
  app.use(bodyParser.json({ verify: rawBodyBuffer }));

  // Raw body parser for the webhook route
  app.use('/subscription/webhook', express.raw({ type: 'application/json' }));

  // JSON parser for all other routes
  app.use((req, res, next) => {
    if (req.originalUrl !== '/subscription/webhook') {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // If you need to increase the body size limit
  app.useBodyParser('json', { limit: '10mb' });

  await app.listen(configService.get('APP_PORT') || 3001);
}
bootstrap();
