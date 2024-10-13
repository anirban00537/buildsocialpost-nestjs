import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  async onModuleInit() {
    await this.$connect();
    this.$on<any>('error', (e: any) => {
      console.log('Prisma-Error: ' + JSON.stringify(e), 'error');
    });
    this.$on<any>('warn', (e: any) => {
      console.log('Prisma-Warn: ' + e.message, 'warn');
    });
    if (process.env.QUERY_DEBUG === 'true') {
      this.$on<any>('query', (e: any) => {
        console.log('\nQuery: ' + e.query /* , 'debug', undefined, 'stdout' */);
        console.log('Params: ' + e.params /* , 'debug', undefined, 'stdout' */);
        console.log('Duration: ' + e.duration + 'ms\n');
      });
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
