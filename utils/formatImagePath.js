export const formatImageArray = (images, key = "image") => {
  return images.map((item) => ({
    ...item,
    [key]: item[key]?.replace(/\\/g, "/"),
  }));
};