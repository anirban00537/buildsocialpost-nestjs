import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import path from 'path';
import fs from 'fs'; // Import the 'fs' module for file system operations
import { coreConstant } from '../helpers/coreConstant';

/** Constant containing a Regular Expression
 * with the valid image upload types
 */
export const validImageUploadTypesRegex = /jpeg|jpg|png/;

/** Constant that sets the maximum image upload file size */
export const maxImageUploadSize = 10 * 1024 * 1024; // 10MB

// Create the upload directory if it doesn't exist
const uploadDirectory = path.resolve(process.cwd(), coreConstant.FILE_DESTINATION);
fs.mkdirSync(uploadDirectory, { recursive: true });

/** Configurations for the multer library used for file upload.
 *
 * Accepts types jpeg, jpg, and png of size up to 3MB
 */
export const multerUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: uploadDirectory, // Use the 'uploads' directory
    filename: (request, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `${uniqueSuffix}${fileExtension}`;
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
    callback(new Error('Invalid file type'), false);
  },

  limits: {
    fileSize: maxImageUploadSize,
  },
};

export const uploadFile = async (
  file: Express.Multer.File,
  userId: number,
): Promise<string | null> => {
  console.log('Received file in uploadFile:', file);
  if (!file || !file.path) {
    console.warn('No file or file path provided for upload');
    return null;
  }

  const relativePath = path.relative(uploadDirectory, file.path);
  const url = `/${coreConstant.FILE_DESTINATION}/${relativePath.replace(
    /\\/g,
    '/',
  )}`;
  console.log('File URL:', url);

  return url;
};
