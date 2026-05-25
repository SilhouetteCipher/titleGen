// Curated collection of high-end typography fonts on Google Fonts
export const GOOGLE_FONTS = [
  // Elegant & Cinematic Serifs
  { name: 'Cinzel', category: 'Serif', description: 'Classical roman letterforms, perfect for cinematic titles' },
  { name: 'Playfair Display', category: 'Serif', description: 'High-contrast modern serif, editorial elegance' },
  { name: 'Cormorant Garamond', category: 'Serif', description: 'Ultra-thin elegant traditional serif with graceful curves' },
  { name: 'Prata', category: 'Serif', description: 'Didone-style serif with elegant teardrop terminals' },
  { name: 'Bodoni Moda', category: 'Serif', description: 'Extreme-contrast luxury serif for fashion & editorial' },
  { name: 'EB Garamond', category: 'Serif', description: 'Classic textbook Garamond, timeless organic feel' },
  
  // Clean & Tech Sans-Serifs
  { name: 'Outfit', category: 'Sans-serif', description: 'Modern geometric sans-serif, premium look' },
  { name: 'Inter', category: 'Sans-serif', description: 'Highly readable neo-grotesque, clean and neutral' },
  { name: 'Montserrat', category: 'Sans-serif', description: 'Urban, high-personality geometric sans-serif' },
  { name: 'Space Grotesk', category: 'Sans-serif', description: 'Slightly quirky tech-inspired geometric sans-serif' },
  { name: 'Cabinet Grotesk', category: 'Sans-serif', description: 'Bold high-end editorial display sans-serif' },
  { name: 'Syne', category: 'Sans-serif', description: 'Avant-garde, ultra-wide display shapes when heavy' },
  
  // High-Energy & Retro Display
  { name: 'Bungee', category: 'Display', description: 'Thick, rounded bold sign painting typeface' },
  { name: 'Press Start 2P', category: 'Display', description: 'Pixelated retro 8-bit arcade style' },
  { name: 'Syncopate', category: 'Display', description: 'Ultra-wide capital display font, kinetic impact' },
  { name: 'Uncial Antiqua', category: 'Display', description: 'Celtic medieval style fantasy typeface' },
  { name: 'Rubik Glitch', category: 'Display', description: 'Distorted computer glitch aesthetic' }
];

const loadedFonts = new Set();

/**
 * Dynamically injects Google Font link and resolves once the browser confirms it is fully loaded
 * @param {string} fontFamily 
 * @returns {Promise<boolean>}
 */
export function loadGoogleFont(fontFamily) {
  if (loadedFonts.has(fontFamily)) {
    return Promise.resolve(true);
  }

  // Handle system default fallback
  if (fontFamily === 'system-ui' || fontFamily === 'sans-serif' || fontFamily === 'serif' || fontFamily === 'monospace') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    try {
      const fontUrlFriendly = fontFamily.replace(/ /g, '+');
      const linkId = `gfont-${fontUrlFriendly}`;
      
      // Inject stylesheet link if it doesn't already exist
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontUrlFriendly}:ital,wght@0,100..900;1,100..900&display=swap`;
        document.head.appendChild(link);
      }

      // Check document.fonts load state
      // We set a safety timeout in case the network fails or slows down
      let timeoutCleared = false;
      const safetyTimeout = setTimeout(() => {
        timeoutCleared = true;
        console.warn(`Font load timed out: ${fontFamily}. Resolving with system fallback.`);
        loadedFonts.add(fontFamily); // Mark loaded to prevent duplicate loops
        resolve(false);
      }, 3000);

      document.fonts.load(`1em "${fontFamily}"`)
        .then(() => {
          if (timeoutCleared) return;
          clearTimeout(safetyTimeout);
          loadedFonts.add(fontFamily);
          resolve(true);
        })
        .catch((err) => {
          if (timeoutCleared) return;
          clearTimeout(safetyTimeout);
          console.error(`Error loading font ${fontFamily}:`, err);
          resolve(false);
        });
    } catch (e) {
      console.error(`Font injection crash for ${fontFamily}:`, e);
      resolve(false);
    }
  });
}
