import uploadToCloudinary from "../services/cloudinary.service.js";
import fs from "fs";
import Upload from "../models/upload.model.js";

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // If the file was already removed (or never existed), ignore.
    if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return;
    console.warn("Failed to delete temp file:", filePath, err?.message || err);
  }
}

async function handleMultipleUploads(req, resourceType = "raw") {
  if (!req.files || Object.keys(req.files).length === 0) return {};

  const uploadedBy = req.user?.firebaseUid;
  const uploadedFiles = {};

  for (const fieldName in req.files) {
    uploadedFiles[fieldName] = [];

    for (const file of req.files[fieldName]) {
      const filePath = file.path;

      try {
        const type =
          resourceType ||
          (file.mimetype.startsWith("image/") ? "image" : "raw");
        const result = await uploadToCloudinary(filePath, type);

        await safeUnlink(filePath);

        const savedUpload = await Upload.create({
          uploadedBy,
          publicId: result.public_id,
          fileType: type,
          originalName: file.originalname,
          fieldName: file.fieldname,
        });

        uploadedFiles[fieldName].push(savedUpload);
      } catch (err) {
        await safeUnlink(filePath);
        console.error(`Failed to upload ${file.originalname}: ${err?.message || err}`);
      }
    }
  }

  return uploadedFiles;
}

export default handleMultipleUploads;
