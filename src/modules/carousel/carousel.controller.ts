import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { User } from '../users/entities/user.entity';
import { ResponseModel } from 'src/shared/models/response.model';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { GenerateCarouselContentDto } from './dto/generate-caorusel-content.dto';
import { Carousel } from '@prisma/client';
import { IsAdmin } from 'src/shared/decorators/is-admin.decorator';

@Controller('my-carousels')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  @Post('create')
  createCarousel(
    @Body() createCarouselDto: Carousel,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.createCarousel(createCarouselDto, user);
  }

  @Put('update')
  updateCarousel(
    @Body() updateCarouselDto: Carousel,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.updateCarousel(updateCarouselDto, user);
  }

  @Delete('delete/:id')
  deleteCarousel(@Param('id') id: string): Promise<ResponseModel> {
    return this.carouselService.deleteCarousel(id);
  }

  @Get('get')
  getCarousels(
    @UserInfo() user: User,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ): Promise<ResponseModel> {
    return this.carouselService.getCarouselsByUser(user, { page, pageSize });
  }

  @Get('get-details')
  getCarousel(@Query('id') id: string): Promise<ResponseModel> {
    return this.carouselService.getCarousel(id);
  }

  @Post('generate-carousel-content')
  generateCarouselContent(
    @Body() dto: GenerateCarouselContentDto,
  ): Promise<ResponseModel> {
    return this.carouselService.generateCarouselContent(dto);
  }
  @IsAdmin()
  @Get('get-all-carousels')
  getAllCarousels(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ): Promise<ResponseModel> {
    return this.carouselService.getAllCarousels({ page, pageSize });
  }
}
