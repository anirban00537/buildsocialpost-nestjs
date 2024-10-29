import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiContentService } from './ai-content.service';
import { CreateAiContentDto } from './dto/create-ai-content.dto';
import { UpdateAiContentDto } from './dto/update-ai-content.dto';
import { ResponseModel } from 'src/shared/models/response.model';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { GenerateLinkedInPostsDto } from './dto/generate-linkedin-posts.dto';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate-carousel-content')
  generateCarouselContent(
    @Body() dto: GenerateCarouselContentDto,
  ): Promise<ResponseModel> {
    return this.aiContentService.generateCarouselContent(dto);
  }

  @Post('generate-linkedin-posts')
  generateLinkedInPosts(
    @Body() dto: GenerateLinkedInPostsDto,
  ): Promise<ResponseModel> {
    return this.aiContentService.generateLinkedInPosts(dto);
  }
}
