import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

export const configureCloudinary = (): void => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    console.warn('[Cloudinary] Warning: CLOUDINARY_URL is missing. direct uploads to backend buffer streams will fail.');
    return;
  }
  
  cloudinary.config({
    cloudinary_api_url: cloudinaryUrl
  });
  console.log('[Cloudinary] SDK successfully configured.');
};

export { cloudinary };
export const uploadBuffer = async (buffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'aicity_incidents' }, (error, result) => {
      if (error) return reject(error);
      resolve(result!.secure_url);
    }).end(buffer);
  });
};
