import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUpdateBrandingDto } from './dto/create-update-branding.dto';
import { UserBranding } from '@prisma/client';
import { ResponseModel } from 'src/shared/models/response.model';
import {
  errorResponse,
  myLogger,
  successResponse,
} from 'src/shared/helpers/functions';
import * as fs from 'fs';
import * as path from 'path';
import { coreConstant } from 'src/shared/helpers/coreConstant';
import { uploadFile } from 'src/shared/configs/multer-upload.config';
import { MyLogger } from '../logger/logger.service';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async createUpdateBranding(
    userId: number,
    createUpdateBrandingDto: CreateUpdateBrandingDto,
    headshot?: Express.Multer.File,
  ): Promise<ResponseModel> {
    try {
      console.log('Received headshot in service:', headshot);
      let headshotUrl: string | null = null;

      if (headshot) {
        headshotUrl = await uploadFile(headshot, userId);
        console.log('Headshot upload result:', headshotUrl);
      }

      const existingBranding = await this.prisma.userBranding.findUnique({
        where: { userId },
      });
      let userBranding: UserBranding;

      if (existingBranding) {
        // Update existing branding
        userBranding = await this.prisma.userBranding.update({
          where: { userId },
          data: {
            name: createUpdateBrandingDto.name,
            handle: createUpdateBrandingDto.handle,
            headshot: headshotUrl || existingBranding.headshot, // Keep existing headshot if no new file is uploaded
          },
        });
        if (!userBranding) {
          return errorResponse('Failed to update branding');
        }
      } else {
        userBranding = await this.prisma.userBranding.create({
          data: {
            userId,
            name: createUpdateBrandingDto.name,
            handle: createUpdateBrandingDto.handle,
            headshot: headshotUrl,
          },
        });
        if (!userBranding) {
          return errorResponse('Failed to create branding');
        }
      }
      return successResponse('Branding updated successfully', {
        branding: userBranding,
      });
    } catch (error) {
      console.error('Error in createUpdateBranding:', error);
      return errorResponse('Failed to create or update branding');
    }
  }

  async getBranding(userId: number): Promise<ResponseModel> {
    try {
      const userBranding = await this.prisma.userBranding.findUnique({
        where: { userId },
      });
      if (!userBranding) {
        return errorResponse('Branding not found');
      }
      return successResponse('Branding retrieved successfully', {
        branding: userBranding,
      });
    } catch (error) {
      console.error('Error in getBranding:', error);
      return errorResponse('Failed to retrieve branding');
    }
  }
}
