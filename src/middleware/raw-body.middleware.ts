import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rawBody from 'raw-body';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (req.headers['content-type'] === 'application/json') {
      try {
        const raw = await rawBody(req);
        (req as any).rawBody = raw;
      } catch (error) {
        console.error('Error reading raw body:', error);
        next(error);
        return;
      }
    }
    next();
  }
}
