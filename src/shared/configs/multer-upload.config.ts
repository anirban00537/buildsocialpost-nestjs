import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import path from 'path';
import fs from 'fs'; // Import the 'fs' module for file system operations
import { PrismaClient } from '../helpers/functions';
import { coreConstant } from '../helpers/coreConstant';

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
      PrismaClient.myUploads
        .create({
          data: {
            // user_id: Number(user.id),
            user: {
              connect: { id: user.id }, // Connect the upload to the user
            },
            fieldname: originalname,
            mimetype: mimetype,
            originalname: originalname,
            file_path: `/${coreConstant.FILE_DESTINATION}/${fileName}`,
            filename: fileName,
          },
        })
        .then((res) => {
          console.log(res, 'res');
        });

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
