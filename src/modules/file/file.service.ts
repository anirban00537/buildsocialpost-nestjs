import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uploadFile } from '../../shared/configs/multer-upload.config';
import { User } from '../users/entities/user.entity';
import { ResponseModel } from 'src/shared/models/response.model';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import {
  PaginationOptions,
  paginatedQuery,
} from 'src/shared/utils/pagination.util';
import { GetFileDto } from './dto/get-file.dto';
import { plainToClass } from 'class-transformer';
import * as fs from 'fs/promises';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(
    file: Express.Multer.File,
    user: User,
  ): Promise<ResponseModel> {
    try {
      const url = await uploadFile(file, user.id);
      if (!url) {
        return errorResponse('File upload failed');
      }

      const newFile = await this.prisma.file.create({
        data: {
          name: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          url: url,
          userId: user.id,
        },
      });

      const fileResponse = plainToClass(GetFileDto, newFile, {
        excludeExtraneousValues: true,
      });
      return successResponse('File uploaded successfully', fileResponse);
    } catch (error) {
      return errorResponse('File upload failed');
    }
  }

  async getFiles(
    user: User,
    options: PaginationOptions = {},
  ): Promise<ResponseModel> {
    try {
      const result = await paginatedQuery(
        this.prisma,
        'file',
        { userId: user.id },
        options,
      );

      if (result.items.length === 0) {
        return errorResponse('No files found for this user');
      }

      const fileResponses = result.items.map((item) =>
        plainToClass(GetFileDto, item, { excludeExtraneousValues: true }),
      );
      return successResponse('Files found successfully', {
        ...result,
        items: fileResponses,
      });
    } catch (error) {
      return errorResponse('Error fetching files');
    }
  }

  async getFile(id: string): Promise<ResponseModel> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id },
      });
      if (!file) {
        return errorResponse('File not founds');
      }
      const fileResponse = plainToClass(GetFileDto, file, {
        excludeExtraneousValues: true,
      });
      return successResponse('File found successfully', fileResponse);
    } catch (error) {
      return errorResponse('Error fetching file');
    }
  }

  async deleteFile(id: string, user: User): Promise<ResponseModel> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id, userId: user.id },
      });

      if (!file) {
        return errorResponse('File not found');
      }

      // Delete the file from storage
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Error deleting file from storage:', unlinkError);
        // Continue with database deletion even if file removal fails
      }

      // Delete the file record from the database
      const deletedFile = await this.prisma.file.delete({
        where: { id, userId: user.id },
      });

      const fileResponse = plainToClass(GetFileDto, deletedFile, {
        excludeExtraneousValues: true,
      });
      return successResponse('File deleted successfully', fileResponse);
    } catch (error) {
      console.error('Error deleting file:', error);
      return errorResponse('Error deleting file');
    }
  }

  async getImageUsage(userId: number): Promise<ResponseModel> {
    console.log('calling usage');
    try {
      const totalCount = await this.prisma.file.count({
        where: { userId },
      });
      console.log(totalCount, 'totalCount');

      const totalSize = await this.prisma.file.aggregate({
        where: { userId },
        _sum: {
          size: true,
        },
      });
      console.log(totalSize, 'totalSize');
      const usage = {
        totalCount,
        totalSize: totalSize._sum.size || 0,
      };
      console.log(usage, 'usage');
      if (totalCount === 0) {
        return successResponse('No images found for this user', usage);
      }

      return successResponse('Image usage retrieved successfully', usage);
    } catch (error) {
      return errorResponse('Failed to retrieve image usage');
    }
  }
}
