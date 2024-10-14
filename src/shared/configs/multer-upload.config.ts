import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import path from 'path';
import fs from 'fs'; // Import the 'fs' module for file system operations
import { PrismaClient } from '../helpers/functions';
import { coreConstant } from '../helpers/coreConstant';
import { BadRequestException } from '@nestjs/common';

/** Constant containing a Regular Expression
 * with the valid image upload types
 */
export const validImageUploadTypesRegex = /jpeg|jpg|png/;

/** Constant that sets the maximum image upload file size */
export const maxImageUploadSize = 3 * 1024 * 1024; // 3MB

// Create the 'uploads' directory if it doesn't exist
const uploadDirectory = `./${coreConstant.FILE_DESTINATION}`;
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

/** Configurations for the multer library used for file upload.
 *
 * Accepts types jpeg, jpg, and png of size up to 3MB
 */
export const multerUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: uploadDirectory, // Use the 'uploads' directory
    filename: (request, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const user: any = request.user;
      const { originalname, mimetype, path } = file;

      const fileName = `${uniqueSuffix}-${file.originalname}`;

      return callback(null, fileName);
    },
  }),

  fileFilter: (request, file, callback) => {
    const mimetype = validImageUploadTypesRegex.test(file.mimetype);
    const extname = validImageUploadTypesRegex.test(
      path.extname(file.originalname).toLowerCase(),
    );

    if (mimetype && extname) {
      return callback(null, true);
    }

    // return callback(new FileTypeError(validImageUploadTypesRegex), false);
  },

  limits: {
    fileSize: maxImageUploadSize,
  },
};

export const uploadFile = async (file: Express.Multer.File, userId: number): Promise<string | null> => {
  console.log('Received file in uploadFile:', file);
  if (!file) {
    console.warn('No file provided for upload');
    return null;
  }

  if (file.path) {
    // File is already saved by Multer, just return the URL
    const relativePath = path.relative(coreConstant.FILE_DESTINATION, file.path);
    const url = `${coreConstant.FILE_DESTINATION}/${relativePath.replace(/\\/g, '/')}`;
    console.log('File already uploaded. URL:', url);
    return url;
  }

  if (!file.buffer) {
    console.warn('No file buffer provided for upload');
    return null;
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(coreConstant.FILE_DESTINATION, `${userId}`, fileName);

  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, file.buffer);
    
    const url = `${coreConstant.FILE_DESTINATION}/${userId}/${fileName}`;
    console.log('File uploaded successfully. URL:', url);
    return url;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};
