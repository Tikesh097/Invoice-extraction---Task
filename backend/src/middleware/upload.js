import multer from 'multer';

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '20') * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 10 },
  fileFilter,
});

export const singleUpload = uploadMiddleware.single('file');
export const multiUpload = uploadMiddleware.array('files', 10);
