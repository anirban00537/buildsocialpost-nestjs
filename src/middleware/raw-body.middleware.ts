import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) {
    if (req.originalUrl === '/subscription/webhook') {
      req.rawBody = req.body;
    }
    next();
  }
}
