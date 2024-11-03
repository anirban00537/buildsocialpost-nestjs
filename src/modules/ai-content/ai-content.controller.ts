import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiContentService } from './ai-content.service';
import { ResponseModel } from 'src/shared/models/response.model';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { GenerateLinkedInPostsDto } from './dto/generate-linkedin-posts.dto';
import { User } from '../users/entities/user.entity';
import { UserInfo } from 'src/shared/decorators/user.decorators';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate-carousel-content')
  generateCarouselContent(
    @UserInfo() user: User,
    @Body() dto: GenerateCarouselContentDto,
  ): Promise<ResponseModel> {
    return this.aiContentService.generateCarouselContent(user.id, dto);
  }

  @Post('generate-linkedin-posts')
  generateLinkedInPosts(
    @UserInfo() user: User,
    @Body() dto: GenerateLinkedInPostsDto,
  ): Promise<ResponseModel> {
    return this.aiContentService.generateLinkedInPosts(user.id, dto);
  }
}
