import { Module } from '@nestjs/common';
import { AiContentService } from './ai-content.service';
import { AiContentController } from './ai-content.controller';
import { OpenAIService } from './openai.service';

@Module({ 
  controllers: [AiContentController],
  providers: [AiContentService, OpenAIService],
})
export class AiContentModule {}
