import { Injectable } from '@nestjs/common';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { User } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseModel } from 'src/shared/models/response.model';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import {
  paginatedQuery,
  PaginationOptions,
} from 'src/shared/utils/pagination.util';
import {
  generateCarouselColorPaletteFromPromptTopic,
  generateCaruselContentFromTopic,
  parseCarouselContentToJSON,
  parseColorPaletteToJSON,
} from 'src/shared/helpers/openai';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { Carousel } from '@prisma/client';

@Injectable()
export class CarouselService {
  constructor(private readonly prisma: PrismaService) {}

  async createCarousel(
    createCarouselDto: Carousel,
    user: User,
  ): Promise<ResponseModel> {
    try {
      const carousel = await this.prisma.carousel.create({
        data: {
          data: createCarouselDto.data,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      if (!carousel) {
        return errorResponse('Carousel not created');
      }
      return successResponse('Carousel created successfully', carousel);
    } catch (error) {
      console.error('Error creating carousel:', error);
      return errorResponse('Carousel not created');
    }
  }

  async updateCarousel(
    updateCarouselDto: Carousel,
    user: User,
  ): Promise<ResponseModel> {
    try {
      const carousel = await this.prisma.carousel.update({
        where: {
          id: updateCarouselDto.id,
        },
        data: {
          data: updateCarouselDto.data,
        },
      });
      if (!carousel) {
        return errorResponse('Carousel not updated');
      }
      return successResponse('Carousel updated successfully', carousel);
    } catch (error) {
      console.log(error);
      return errorResponse('Carousel not updated');
    }
  }

  async deleteCarousel(id: string): Promise<ResponseModel> {
    try {
      const carousel = await this.prisma.carousel.delete({
        where: {
          id,
        },
      });
      if (!carousel) {
        return errorResponse('Carousel not deleted');
      }
      return successResponse('Carousel deleted successfully', carousel);
    } catch (error) {
      return errorResponse('Carousel not deleted');
    }
  }

  async getCarousel(id: string): Promise<ResponseModel> {
    try {
      const carousel = await this.prisma.carousel.findUnique({
        where: {
          id,
        },
      });
      if (!carousel) {
        return errorResponse('Carousel not found');
      }
      return successResponse('Carousel found successfully', carousel);
    } catch (error) {
      return errorResponse('Carousel not found');
    }
  }

  async getCarouselsByUser(
    user: User,
    options: PaginationOptions = {},
  ): Promise<ResponseModel> {
    try {
      const result = await paginatedQuery(
        this.prisma,
        'carousel',
        { userId: user.id },
        { ...options, orderBy: { createdAt: 'desc' } },
      );

      if (result.items.length === 0) {
        return errorResponse('No carousels found for this user');
      }

      return successResponse('Carousels found successfully', result);
    } catch (error) {
      console.log(error, 'errosr');
      return errorResponse('Error fetching carousels');
    }
  }

  async generateCarouselContent(
    dto: GenerateCarouselContentDto,
  ): Promise<ResponseModel> {
    try {
      const content: any = await generateCaruselContentFromTopic(
        dto.topic,
        dto.numSlides,
        dto.language,
        dto.mood,
        dto.contentStyle,
        dto.targetAudience,
      );

      let colorPaletteResponse = null;

      if (dto.themeActive) {
        colorPaletteResponse =
          await generateCarouselColorPaletteFromPromptTopic(
            dto.topic,
            dto.theme,
          );
      }

      const response = parseCarouselContentToJSON(content ?? '');
      const colorPalette =
        colorPaletteResponse !== null
          ? parseColorPaletteToJSON(colorPaletteResponse ?? '')
          : null;

      return successResponse('Carousel content generated successfully', {
        response,
        colorPalette,
      });
    } catch (error) {
      return errorResponse('Error generating carousel content');
    }
  }
}
