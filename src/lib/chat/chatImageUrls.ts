const CLOUDINARY_IMAGE_UPLOAD = /(\/image\/upload\/)(?![a-z]_[^/]+\/)/i;

/** Creates a size-limited Cloudinary delivery URL for chat previews. */
export function chatImagePreviewUrl(url: string, width = 960): string {
  if (!/^https?:\/\/res\.cloudinary\.com\//i.test(url)) return url;
  const safeWidth = Math.max(160, Math.min(1600, Math.round(width)));
  return url.replace(
    CLOUDINARY_IMAGE_UPLOAD,
    `$1c_limit,w_${safeWidth},f_auto,q_auto/`,
  );
}
