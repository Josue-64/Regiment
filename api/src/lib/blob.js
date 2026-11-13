const { BlobServiceClient, BlobSASPermissions } = require('@azure/storage-blob');
const crypto = require('crypto');

const container = () =>
  BlobServiceClient.fromConnectionString(process.env.BLOB_CONNECTION_STRING)
    .getContainerClient(process.env.PHOTO_CONTAINER || 'progress-photos');

const inMinutes = (m) => new Date(Date.now() + m * 60 * 1000);

// Short-lived URL the browser PUTs the image to directly (never passes through the API)
async function newUploadUrl(userId, ext) {
  const c = container();
  await c.createIfNotExists(); // private container (no public access)
  const blobName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const url = await c.getBlockBlobClient(blobName)
    .generateSasUrl({ permissions: BlobSASPermissions.parse('cw'), expiresOn: inMinutes(10) });
  return { blobName, uploadUrl: url };
}

// Short-lived read URL, so photos stay private
const readUrl = (blobName) =>
  container().getBlobClient(blobName)
    .generateSasUrl({ permissions: BlobSASPermissions.parse('r'), expiresOn: inMinutes(30) });

const removeBlob = (blobName) => container().deleteBlob(blobName).catch(() => {});

module.exports = { newUploadUrl, readUrl, removeBlob };
