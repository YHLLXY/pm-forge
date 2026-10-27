
import sharp from "sharp";
await sharp("C:/temp/shots/cover/home-390-full.png").extract({ left: 0, top: 1750, width: 780, height: 1500 }).toFile("C:/temp/cover-mobile-crop2.png");
console.log("ok");
