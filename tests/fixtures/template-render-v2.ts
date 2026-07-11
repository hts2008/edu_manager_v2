export const onePixelPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const onePixelPngDataUri = `data:image/png;base64,${onePixelPngBase64}`;

export function validV2Config(background = onePixelPngDataUri) {
  return {
    version: 2,
    background: { src: background },
    bindings: [
      {
        field: "student.name",
        x: 20,
        y: 30,
        width: 80,
        height: 10,
        fontSize: 12,
        color: "#111827",
        align: "left",
      },
    ],
  };
}
