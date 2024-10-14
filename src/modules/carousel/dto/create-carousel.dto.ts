import { IsString, IsInt, IsUUID, IsObject, IsOptional } from 'class-validator';

export class CreateCarouselDto {
  @IsInt()
  userId: number;

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

  @IsObject()
  slides: Record<string, any>;

  @IsOptional()
  @IsObject()
  sharedSelectedElement?: Record<string, any>;

  @IsString()
  fontFamily: string;

  @IsOptional()
  @IsObject()
  globalBackground?: Record<string, any>;
}
