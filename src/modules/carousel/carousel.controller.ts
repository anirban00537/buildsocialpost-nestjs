import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { ResponseModel } from 'src/shared/models/response.model';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { Carousel, User } from '@prisma/client';
import { IsAdmin } from 'src/shared/decorators/is-admin.decorator';
import { GetCarouselQueryDto, GetCarouselsQueryDto } from './dto/query.dto';

@Controller('my-carousels')
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  @Post('create')
  createCarousel(
    @Body() createCarouselDto: CreateCarouselDto,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.createCarousel(createCarouselDto, user);
  }

  @Put('update')
  updateCarousel(
    @Body() updateCarouselDto: UpdateCarouselDto,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.updateCarousel(updateCarouselDto, user);
  }

  @Delete('delete/:id')
  deleteCarousel(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.deleteCarousel(id, user);
  }

  @Get('get')
  getCarousels(
    @UserInfo() user: User,
    @Query() query: GetCarouselsQueryDto,
  ): Promise<ResponseModel> {
    return this.carouselService.getCarouselsByUser(
      user,
      {
        page: query.page,
        pageSize: query.pageSize,
      },
      query.workspaceId,
    );
  }

  @Get('get-details')
  getCarousel(
    @Query() query: GetCarouselQueryDto,
    @UserInfo() user: User,
  ): Promise<ResponseModel> {
    return this.carouselService.getCarousel(query.id, user, query.workspaceId);
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
