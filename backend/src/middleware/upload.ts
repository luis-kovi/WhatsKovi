import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadRoot = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomSuffix}${ext}`);
  }
});

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

const allowedMimePrefixes = ['image/', 'video/', 'audio/', 'application/'];

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix))) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipo de arquivo nao suportado'));
  }
});

export default upload;
