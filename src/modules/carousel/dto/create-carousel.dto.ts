import { IsString, IsObject, IsOptional, IsArray } from 'class-validator';

export class CreateCarouselDto {
  @IsString()
  name: string;

  @IsObject()
  titleTextSettings: Record<string, any>;

  @IsObject()
  descriptionTextSettings: Record<string, any>;

  @IsObject()
  taglineTextSettings: Record<string, any>;

  @IsObject()
  layout: Record<string, any>;

  @IsObject()
  background: Record<string, any>;

  @IsArray()
  slides: Array<any>;

  @IsOptional()
  @IsObject()
  sharedSelectedElement?: Record<string, any>;

  @IsString()
  fontFamily: string;

  @IsOptional()
  @IsObject()
  globalBackground?: Record<string, any> | null;
}
