import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateLinkedInPostsDto {
  @ApiProperty({
    description: 'The main topic or prompt for generating LinkedIn posts',
    example: 'Share insights about artificial intelligence in business',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Number of posts to generate (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => parseInt(value))
  numPosts: number;

  @ApiPropertyOptional({
    description: 'Language code for the generated posts',
    example: 'en',
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh'])
  language?: string;

  @ApiPropertyOptional({
    description: 'Tone of the generated posts',
    example: 'professional',
    default: 'professional',
    enum: [
      'professional',
      'casual',
      'formal',
      'friendly',
      'enthusiastic',
      'informative',
      'authoritative',
      'conversational',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'professional',
    'casual',
    'formal',
    'friendly',
    'enthusiastic',
    'informative',
    'authoritative',
    'conversational',
  ])
  tone?: string;
}
