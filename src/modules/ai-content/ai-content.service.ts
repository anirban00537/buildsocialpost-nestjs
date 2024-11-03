import { Injectable, Logger } from '@nestjs/common';
import { successResponse, errorResponse } from 'src/shared/helpers/functions';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { GenerateLinkedInPostsDto } from './dto/generate-linkedin-posts.dto';
import { ResponseModel } from 'src/shared/models/response.model';
import { OpenAIService } from './openai.service';
import { PrismaService } from '../prisma/prisma.service';

interface TokenCheckResult {
  isValid: boolean;
  message: string;
  remainingTokens: number;
  totalTokens: number;
}

@Injectable()
export class AiContentService {
  private readonly logger = new Logger(AiContentService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly prisma: PrismaService,
  ) {}

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private getErrorMessage(message: string): string {
    const errorMessages = {
      TOKEN_NOT_FOUND:
        'Insufficient word tokens available please purchase/upgrade package',
      TOKEN_EXPIRED: 'Word tokens have expired',
      INSUFFICIENT_TOKENS: 'Insufficient word tokens available',
    };
    return errorMessages[message] || 'Error processing word tokens';
  }

  private async checkTokenAvailability(
    userId: number,
    wordCount: number,
  ): Promise<TokenCheckResult> {
    try {
      const wordUsage = await this.prisma.aIWordUsage.findUnique({
        where: { userId },
      });

      if (!wordUsage) {
        return {
          isValid: false,
          message: 'TOKEN_NOT_FOUND',
          remainingTokens: 0,
          totalTokens: 0,
        };
      }

      if (wordUsage.expirationTime < new Date()) {
        return {
          isValid: false,
          message: 'TOKEN_EXPIRED',
          remainingTokens: 0,
          totalTokens: wordUsage.totalWordLimit,
        };
      }

      const remainingTokens =
        wordUsage.totalWordLimit - wordUsage.wordsGenerated;

      if (wordCount > remainingTokens) {
        return {
          isValid: false,
          message: 'INSUFFICIENT_TOKENS',
          remainingTokens,
          totalTokens: wordUsage.totalWordLimit,
        };
      }

      return {
        isValid: true,
        message: 'TOKENS_AVAILABLE',
        remainingTokens,
        totalTokens: wordUsage.totalWordLimit,
      };
    } catch (error) {
      this.logger.error(`Error checking token availability: ${error.message}`);
      throw error;
    }
  }

  private async deductTokens(
    userId: number,
    wordCount: number,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.aIWordUsage.update({
          where: { userId },
          data: {
            wordsGenerated: {
              increment: wordCount,
            },
          },
        }),
        this.prisma.wordTokenLog.create({
          data: {
            aiWordUsageId: userId,
            amount: -wordCount,
            type: 'USAGE',
            description: `Content generation: ${wordCount} words`,
          },
        }),
      ]);
      return true;
    } catch (error) {
      this.logger.error(`Error deducting tokens: ${error.message}`);
      throw error;
    }
  }

  async getTokenUsage(userId: number): Promise<ResponseModel> {
    try {
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      let tokenUsage = await this.prisma.aIWordUsage.findUnique({
        where: { userId },
        select: {
          totalWordLimit: true,
          wordsGenerated: true,
          expirationTime: true,
        },
      });

      const used = tokenUsage.wordsGenerated;
      const total = tokenUsage.totalWordLimit;
      const remaining = total - used;
      const isActive = tokenUsage.expirationTime > now;

      return successResponse('Token usage data', {
        usage: {
          used,
          remaining,
          total,
          isActive,
          expirationDate: tokenUsage.expirationTime,
        },
        percentage: {
          used: Math.round((used / total) * 100) || 0,
          remaining: Math.round((remaining / total) * 100) || 0,
        },
      });
    } catch (error) {
      this.logger.error(`Error getting token usage: ${error.message}`);
      return errorResponse('Error fetching token usage data');
    }
  }

  async generateCarouselContent(
    userId: number,
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

      const actualWordCount = this.calculateWordCount(content);

      const tokenCheck = await this.checkTokenAvailability(
        userId,
        actualWordCount,
      );

      if (!tokenCheck.isValid) {
        return errorResponse(this.getErrorMessage(tokenCheck.message));
      }

      await this.deductTokens(userId, actualWordCount);

      let colorPaletteResponse: string | null = null;
      if (dto.themeActive) {
        colorPaletteResponse =
          await this.openAIService.generateCarouselColorPaletteFromPromptTopic(
            dto.topic,
            dto.theme,
          );
      }

      const response = this.openAIService.parseCarouselContentToJSON(content);
      const colorPalette = colorPaletteResponse
        ? this.openAIService.parseColorPaletteToJSON(colorPaletteResponse)
        : null;

      return successResponse('Carousel content generated successfully', {
        response,
        colorPalette,
        wordCount: actualWordCount,
        remainingTokens: tokenCheck.remainingTokens - actualWordCount,
        totalTokens: tokenCheck.totalTokens,
      });
    } catch (error) {
      this.logger.error(`Error generating carousel content: ${error.message}`);
      return errorResponse('Error generating carousel content');
    }
  }

  async generateLinkedInPosts(
    userId: number,
    dto: GenerateLinkedInPostsDto,
  ): Promise<ResponseModel> {
    try {
      const rawContent: string = await this.openAIService.generateLinkedInPosts(
        dto.prompt,
        dto.language,
        dto.tone,
        dto.writingStyle,
      );

      const actualWordCount = this.calculateWordCount(rawContent);

      const tokenCheck = await this.checkTokenAvailability(
        userId,
        actualWordCount,
      );

      if (!tokenCheck.isValid) {
        return errorResponse(this.getErrorMessage(tokenCheck.message));
      }

      await this.deductTokens(userId, actualWordCount);

      return successResponse('LinkedIn post generated successfully', {
        post: rawContent,
        wordCount: actualWordCount,
        remainingTokens: tokenCheck.remainingTokens - actualWordCount,
        totalTokens: tokenCheck.totalTokens,
      });
    } catch (error) {
      this.logger.error(`Error generating LinkedIn post: ${error.message}`);
      return errorResponse('Error generating LinkedIn post');
    }
  }

  async addTokens(userId: number, amount: number): Promise<ResponseModel> {
    try {
      await this.prisma.$transaction([
        this.prisma.aIWordUsage.update({
          where: { userId },
          data: {
            totalWordLimit: {
              increment: amount,
            },
          },
        }),
        this.prisma.wordTokenLog.create({
          data: {
            aiWordUsageId: userId,
            amount: amount,
            type: 'CREDIT',
            description: `Added ${amount} tokens`,
          },
        }),
      ]);

      return successResponse('Tokens added successfully', { amount });
    } catch (error) {
      this.logger.error(`Error adding tokens: ${error.message}`);
      return errorResponse('Error adding tokens');
    }
  }

  async resetTokens(userId: number): Promise<ResponseModel> {
    try {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      await this.prisma.aIWordUsage.update({
        where: { userId },
        data: {
          wordsGenerated: 0,
          totalWordLimit: 0,
          expirationTime: oneMonthFromNow,
        },
      });

      return successResponse('Tokens reset successfully');
    } catch (error) {
      this.logger.error(`Error resetting tokens: ${error.message}`);
      return errorResponse('Error resetting tokens');
    }
  }
}
