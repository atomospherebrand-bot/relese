import path from "path";
import fs from "fs";
import multer from "multer";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    cb(null, `${base}-${ts}${ext || ".bin"}`);
  },
});

export const upload = multer({ storage });
