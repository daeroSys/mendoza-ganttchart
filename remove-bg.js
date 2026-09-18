import { Jimp } from 'jimp';

async function removeBackground() {
  try {
    const image = await Jimp.read('public/website logo.png');
    
    const bgR = image.bitmap.data[0];
    const bgG = image.bitmap.data[1];
    const bgB = image.bitmap.data[2];

    const tolerance = 40; 

    for (let i = 0; i < image.bitmap.data.length; i += 4) {
      const r = image.bitmap.data[i + 0];
      const g = image.bitmap.data[i + 1];
      const b = image.bitmap.data[i + 2];

      if (
        Math.abs(r - bgR) <= tolerance &&
        Math.abs(g - bgG) <= tolerance &&
        Math.abs(b - bgB) <= tolerance
      ) {
        image.bitmap.data[i + 3] = 0; 
      }
    }

    await image.write('public/website logo.png');
    console.log('Background removed successfully');
  } catch (err) {
    console.error('Error removing background:', err);
  }
}

removeBackground();
