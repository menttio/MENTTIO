// Cloudinary unsigned upload utility for profile photos
// Booking file attachments are NOT affected — they use the Base44 Core/UploadFile endpoint

const CLOUDINARY_CLOUD_NAME = 'dowicaglb';
const CLOUDINARY_PROFILE_PRESET = 'menttio_profile_photos';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates and uploads an image file to Cloudinary.
 * Returns the secure_url string on success.
 * Throws an error with a user-friendly message on failure.
 */
export async function uploadProfilePhoto(file) {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('La imagen no puede superar los 5 MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PROFILE_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    let detail = '';
    try {
      const json = await response.json();
      detail = json?.error?.message || '';
    } catch {}
    throw new Error('No se pudo subir la imagen, prueba de nuevo.' + (detail ? ` (${detail})` : ''));
  }

  const data = await response.json();

  if (!data.secure_url) {
    throw new Error('No se pudo subir la imagen, prueba de nuevo.');
  }

  return data.secure_url;
}