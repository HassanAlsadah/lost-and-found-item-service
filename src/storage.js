// ============================================
// Factor 4: Backing Services
// Object Storage is an attached resource
// Connected via GCS_BUCKET env var
// ============================================

const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET || 'lost-and-found-photos';

const uploadPhoto = async (file) => {
  try {
    const bucket = storage.bucket(bucketName);
    const fileName = `items/${uuidv4()}-${file.originalname}`;
    const blob = bucket.file(fileName);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false
    });

    // Make file publicly readable
    await blob.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    logger.info({ fileName }, 'Photo uploaded to object storage');
    return publicUrl;
  } catch (err) {
    logger.error({ err }, 'Photo upload failed');
    throw err;
  }
};

module.exports = { uploadPhoto };
