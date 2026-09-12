import {
    MAX_IMAGE_BYTES,
    validatePickedImage,
} from "../src/media/ImageMediaService";

const image = {
  mimeType: "image/png",
  name: "button.png",
  uri: "file:///button.png",
};

describe("ImageMediaService validation", () => {
  it("accepts supported image formats", () => {
    expect(validatePickedImage(image, 1024)).toBe(".png");
    expect(
      validatePickedImage(
        { ...image, mimeType: "image/jpeg", name: "button.jpeg" },
        1024,
      ),
    ).toBe(".jpg");
  });

  it("rejects unsupported, empty, and oversized files", () => {
    expect(() =>
      validatePickedImage({ ...image, name: "button.gif" }, 1024),
    ).toThrow("PNG, JPEG, or WebP");
    expect(() => validatePickedImage(image, 0)).toThrow("empty");
    expect(() => validatePickedImage(image, MAX_IMAGE_BYTES + 1)).toThrow(
      "5 MB",
    );
  });
});
