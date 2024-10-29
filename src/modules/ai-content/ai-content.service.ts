import { Injectable } from '@nestjs/common';
import { CreateAiContentDto } from './dto/create-ai-content.dto';
import { UpdateAiContentDto } from './dto/update-ai-content.dto';
import { successResponse, errorResponse } from 'src/shared/helpers/functions';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { GenerateLinkedInPostsDto } from './dto/generate-linkedin-posts.dto';
import { ResponseModel } from 'src/shared/models/response.model';
import { OpenAIService } from './openai.service';

@Injectable()
export class AiContentService {
  constructor(private readonly openAIService: OpenAIService) {}

  async generateCarouselContent(
    dto: GenerateCarouselContentDto,
  ): Promise<ResponseModel> {
    try {
      const content: string =
        await this.openAIService.generateCarouselContentFromTopic(
          dto.topic,
          dto.numSlides,
          dto.language,
          dto.mood,
          dto.contentStyle,
          dto.targetAudience,
        );

      let colorPaletteResponse: string | null = null;

      if (dto.themeActive) {
        colorPaletteResponse =
          await this.openAIService.generateCarouselColorPaletteFromPromptTopic(
            dto.topic,
            dto.theme,
          );
      }

      const response = this.openAIService.parseCarouselContentToJSON(
        content ?? '',
      );
      const colorPalette =
        colorPaletteResponse !== null
          ? this.openAIService.parseColorPaletteToJSON(
              colorPaletteResponse ?? '',
            )
          : null;

      return successResponse('Carousel content generated successfully', {
        response,
        colorPalette,
      });
    } catch (error) {
      return errorResponse('Error generating carousel content');
    }
  }

  async generateLinkedInPosts(
    dto: GenerateLinkedInPostsDto,
  ): Promise<ResponseModel> {
    try {
      const rawContent: string = await this.openAIService.generateLinkedInPosts(
        dto.prompt,
        dto.language,
        dto.tone,
        dto.writingStyle,
      );
      console.log(rawContent,"raw")

      return successResponse('LinkedIn post generated successfully', {
        post: rawContent, // Return single post
      });
    } catch (error) {
      return errorResponse('Error generating LinkedIn post');
    }
  }
}
