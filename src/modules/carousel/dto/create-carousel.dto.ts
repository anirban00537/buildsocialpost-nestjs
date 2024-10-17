import { IsString, IsObject, IsOptional, IsArray } from 'class-validator';

export class CreateCarouselDto {
  @IsObject()
  data: Object;
}
