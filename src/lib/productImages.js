const PRODUCT_IMAGE_FILES = [
  "shoe-jordan-1-2.png",
  "shoe-jordan-1.png",
  "shoe-jordan-2.png",
  "shoe-jordan-3.png",
  "shoe-jordan-4.png",
  "shoe-newBalance-1.png",
  "shoe-newBalance-2.png",
  "shoe-newBalance-3.png",
  "shoe-newBalance-4.png",
  "shoe-newBalance-5.png",
  "shoe-newBalance-6.png",
  "shoe-Nike-1.png",
  "shoe-Nike-2.png",
  "shoe-Nike-3.png",
  "shoe-Nike-4-2.png",
  "shoe-Nike-4.png",
  "shoe-png-brown1.png",
  "shoe-png-brown2.png",
  "shoe-png-green.png",
  "shoe-png-green1.png",
  "shoe-png-green2.png",
  "shoe-png-neon.png",
  "shoe-png-neon2.png",
  "shoe-png-neon3.png",
  "shoe-png-neon4.png",
  "shoe-png.png",
  "shoe-puma-1.png",
  "shoe-puma-2.png",
  "shoe-puma-3.png",
  "shoe-puma-4.png",
  "shoe-puma-5.png",
  "shoe-puma-6.png",
  "shoe-puma-7.png",
  "shoe-puma-8.png",
  "shoe-vintage-1.png",
  "shoe-vintage-2.png",
  "shoe-vintage-3.png",
  "cloth-png-black1.png",
  "cloth-png-green1.png",
  "cloth-png-red1.png",
  "cloth-png-white1.png",
  "handbag-png-green1.png",
  "handbag-png-pink1.png",
];

const OFFER_IMAGE_FILES = [
  "shoe-offer-1.png",
  "shoe-offer-2-2.png",
  "shoe-offer-2.png",
  "shoe-offer-3.png",
  "shoe-offer-4.png",
];

const allowedImageFiles = new Set([...PRODUCT_IMAGE_FILES, ...OFFER_IMAGE_FILES]);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getProductImageUrl(fileName) {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to load product images.");
  }
  if (!allowedImageFiles.has(fileName)) {
    throw new Error("Unknown product image.");
  }

  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/product-images/${fileName}`;
}

export const productImageOptions = PRODUCT_IMAGE_FILES.map(getProductImageUrl);
export const offerImageOptions = OFFER_IMAGE_FILES.map(getProductImageUrl);
