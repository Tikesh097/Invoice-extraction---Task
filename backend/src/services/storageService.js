import { supabaseAdmin, STORAGE_BUCKET } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export async function uploadFileToStorage(fileBuffer, originalName, mimetype, userId = 'anonymous') {
  const ext = originalName.split('.').pop().toLowerCase();
  const fileName = `${userId}/${uuidv4()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    logger.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return {
    storagePath: fileName,
    publicUrl: urlData.publicUrl,
    fileName,
  };
}

export async function deleteFileFromStorage(storagePath) {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    logger.warn('Storage delete error:', error);
  }
}

export async function ensureBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some(b => b.name === STORAGE_BUCKET);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: parseInt(process.env.MAX_FILE_SIZE_MB || '20') * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    });
    if (error) logger.error('Bucket creation error:', error);
    else logger.info(`Created storage bucket: ${STORAGE_BUCKET}`);
  }
}
