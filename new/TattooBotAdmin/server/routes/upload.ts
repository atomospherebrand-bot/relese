import { Router } from "express";
import path from "path";
import { upload } from "../middleware/upload";

const router = Router();

/**
 * POST /api/upload
 * multipart/form-data with "file"
 * -> { url: "/uploads/<file>" }
 */
router.post("/upload", upload.fields([{ name: "file", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]), (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const file = Array.isArray(files?.file) ? files?.file[0] : undefined;
  const thumbnailFile = Array.isArray(files?.thumbnail) ? files?.thumbnail[0] : undefined;

  if (!file) {
    return res.status(400).json({ message: "Файл не получен (формат multipart/form-data, поле 'file')." });
  }

  const filename = path.basename(file.path);
  const mediaType = file.mimetype?.startsWith("video/") ? "video" : "image";
  const response: Record<string, any> = {
    url: `/uploads/${filename}`,
    mediaType,
  };

  if (thumbnailFile) {
    response.thumbnail = `/uploads/${path.basename(thumbnailFile.path)}`;
  }

  res.json(response);
});

export default router;
