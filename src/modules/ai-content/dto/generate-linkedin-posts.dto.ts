import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateLinkedInPostsDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  writingStyle?: string;
}
