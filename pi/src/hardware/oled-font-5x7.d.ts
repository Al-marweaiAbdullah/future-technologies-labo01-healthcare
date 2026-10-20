// oled-font-5x7 levert zelf geen types.
declare module "oled-font-5x7" {
  const font: {
    width: number; // pixels per letter
    height: number;
    lookup: string[]; // de tekens, in dezelfde volgorde als fontData
    fontData: number[]; // per teken `width` bytes, elke byte één kolom met bit 0 bovenaan
  };
  export default font;
}
