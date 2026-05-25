// Easing helper functions
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));

const elasticEaseOut = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const easeInBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

/**
 * Renders a single frame of the animated title onto the canvas
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Array} lines - Array of text line configurations
 * @param {string} animationStyle - Animation preset ID
 * @param {number} frame - Current frame index (0-indexed)
 * @param {number} totalFrames - Total frames in the animation
 * @param {number} fps - Framerate
 * @param {object} options - Extra rendering options (e.g. background type)
 */
export function renderFrame(canvas, lines, animationStyle, frame, totalFrames, fps, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  
  // 1. Clear background
  ctx.clearRect(0, 0, width, height);
  
  if (options.bgType === 'green') {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, width, height);
  } else if (options.bgType === 'blue') {
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, width, height);
  } else if (options.bgType === 'color' && options.bgColor) {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  if (lines.length === 0) return;

  if (animationStyle === 'ready-start') {
    renderReadyStart(ctx, width, height, lines, frame, totalFrames, fps);
    return;
  }

  // 2. Pre-calculate structural dimensions
  // We want to calculate the height of each line to center the stack vertically
  const lineHeights = lines.map(line => line.size);
  const gap = 24; // Vertical spacing between lines
  const totalHeight = lineHeights.reduce((a, b) => a + b, 0) + gap * (lines.length - 1);
  
  let startY = (height - totalHeight) / 2;

  // 3. Render each line
  lines.forEach((line, idx) => {
    ctx.save();
    
    // Staggered delay for intro (0.2 seconds delay per line)
    const introDelaySec = idx * 0.25;
    const introDelayFrames = Math.floor(introDelaySec * fps);
    
    // Intro duration is fixed at 1.0 second (30 frames @ 30fps)
    const introDurationFrames = Math.floor(1.0 * fps);
    
    // Outro duration is fixed at 0.8 seconds
    const outroDurationFrames = Math.floor(0.8 * fps);
    
    // Calculate phase progress values (0 to 1)
    let t_intro = 0;
    if (frame >= introDelayFrames) {
      t_intro = Math.min(1, (frame - introDelayFrames) / introDurationFrames);
    }
    
    let t_outro = 0;
    const outroStartFrame = totalFrames - outroDurationFrames;
    if (frame >= outroStartFrame) {
      t_outro = Math.min(1, (frame - outroStartFrame) / outroDurationFrames);
    }

    // Determine typography text rendering parameters
    let textToDraw = line.text;
    if (line.transform === 'uppercase') textToDraw = textToDraw.toUpperCase();
    if (line.transform === 'lowercase') textToDraw = textToDraw.toLowerCase();

    // Default animation variables
    let opacity = 1;
    let translateX = 0;
    let translateY = 0;
    let scaleX = 1;
    let scaleY = 1;
    let blurPx = 0;
    let glitchActive = false;
    let rgbSplitAmount = options.crtChromaticAberration || 0;
    let skewX = 0;
    let currentTracking = line.tracking || 0;
    let clipMaskActive = false;
    let sweepActive = false;
    let sweepProgress = 1;

    // Apply animation calculations based on selected preset
    switch (animationStyle) {
      case 'blur-slide': {
        // Intro: slides up, fades in, and un-blurs
        if (frame < outroStartFrame) {
          const p = easeOutCubic(t_intro);
          opacity = p;
          translateY = 40 * (1 - p);
          blurPx = 15 * (1 - p);
        } 
        // Outro: slides up, fades out, and blurs
        else {
          const p = easeInCubic(t_outro);
          opacity = 1 - p;
          translateY = -40 * p;
          blurPx = 15 * p;
        }
        break;
      }
      
      case 'cyber-glitch': {
        // Intro: digital flicker + massive chromatic RGB split
        if (frame < outroStartFrame) {
          // Terminal digital boot flicker
          const flicker = (Math.sin(frame * 0.8) * Math.cos(frame * 0.3) > -0.3) || t_intro > 0.7;
          opacity = t_intro > 0.05 && flicker ? t_intro : 0;
          
          if (t_intro < 0.9) {
            glitchActive = Math.random() < 0.25;
            rgbSplitAmount = (options.crtChromaticAberration || 0) + (glitchActive ? 15 * (1 - t_intro) : 0);
            translateX = glitchActive ? (Math.random() - 0.5) * 20 : 0;
          }
        } 
        // Hold: subtle text flickering / chromatic vibes + pulsating glow
        else {
          // Outro: flicker out
          const flicker = (frame % 3 !== 0) && (1 - t_outro > 0.2);
          opacity = flicker ? 1 - t_outro : 0;
          if (t_outro > 0.1) {
            glitchActive = Math.random() < 0.3;
            rgbSplitAmount = (options.crtChromaticAberration || 0) + (glitchActive ? 10 * t_outro : 0);
          }
        }
        
        // Dynamic horizontal scanline vibration during hold
        if (!glitchActive && Math.random() < 0.02) {
          glitchActive = true;
          rgbSplitAmount = (options.crtChromaticAberration || 0) + 8;
          translateX = (Math.random() - 0.5) * 12;
        }
        break;
      }

      case 'elastic-pop': {
        // Intro: scale elastic pop bounce in
        if (frame < outroStartFrame) {
          const p = elasticEaseOut(t_intro);
          scaleX = p;
          scaleY = p;
          opacity = Math.min(1, t_intro * 2.5);
        } else {
          // Outro: shrink and pop out
          const p = easeInBack(t_outro);
          scaleX = 1 - p;
          scaleY = 1 - p;
          opacity = 1 - p;
        }
        break;
      }

      case 'typewriter': {
        // Intro: typewriter print character by character
        if (frame < outroStartFrame) {
          const charCount = Math.floor(t_intro * line.text.length);
          textToDraw = line.text.substring(0, charCount);
          
          // Apply casing transformation on the sliced typewriter string
          if (line.transform === 'uppercase') textToDraw = textToDraw.toUpperCase();
          if (line.transform === 'lowercase') textToDraw = textToDraw.toLowerCase();
          
          opacity = 1;
          
          // Blinking cursor
          const showCursor = Math.floor(frame / 5) % 2 === 0;
          if (showCursor && t_intro < 1) {
            textToDraw += '_';
          }
        } else {
          // Outro: soft fade-out
          opacity = 1 - t_outro;
        }
        break;
      }

      case 'cushion-bounce': {
        // Staggered left/right slides with cushion deceleration
        const fromLeft = idx % 2 === 0;
        if (frame < outroStartFrame) {
          const p = easeOutExpo(t_intro);
          opacity = p;
          translateX = (fromLeft ? -200 : 200) * (1 - p);
        } else {
          // Outro: slide down and fade out
          const p = easeInCubic(t_outro);
          opacity = 1 - p;
          translateY = 50 * p;
        }
        break;
      }

      case 'scale-overshoot': {
        if (frame < outroStartFrame) {
          const p = elasticEaseOut(t_intro);
          scaleX = p;
          scaleY = p;
          opacity = Math.min(1, t_intro * 2.5);
        } else {
          const p = easeInBack(t_outro);
          scaleX = Math.max(0, 1 - p);
          scaleY = Math.max(0, 1 - p);
          opacity = 1 - p;
        }
        break;
      }

      case 'mask-reveal': {
        clipMaskActive = true;
        if (frame < outroStartFrame) {
          const p = easeOutCubic(t_intro);
          opacity = p;
          translateY = line.size * 1.3 * (1 - p);
        } else {
          const p = easeInCubic(t_outro);
          opacity = 1 - p;
          translateY = line.size * 1.3 * p;
        }
        break;
      }

      case 'skew-slide': {
        const fromLeft = idx % 2 === 0;
        if (frame < outroStartFrame) {
          const p = easeOutExpo(t_intro);
          const p_skew = easeOutCubic(t_intro);
          opacity = p;
          translateX = (fromLeft ? -250 : 250) * (1 - p);
          skewX = (fromLeft ? -0.4 : 0.4) * (1 - p_skew);
        } else {
          const p = easeInCubic(t_outro);
          opacity = 1 - p;
          translateX = (fromLeft ? 200 : -200) * p;
          skewX = (fromLeft ? 0.3 : -0.3) * p;
        }
        break;
      }

      case 'tracking-expand': {
        if (frame < outroStartFrame) {
          const p = easeOutExpo(t_intro);
          opacity = p;
          currentTracking = -6 + ((line.tracking || 0) + 12) * p;
          blurPx = 8 * (1 - p);
        } else {
          const p = easeInCubic(t_outro);
          opacity = 1 - p;
          currentTracking = (line.tracking || 0) + 6 + 15 * p;
          blurPx = 8 * p;
        }
        break;
      }

      case 'light-sweep': {
        sweepActive = true;
        if (frame < outroStartFrame) {
          sweepProgress = easeOutCubic(t_intro);
          opacity = 1;
        } else {
          sweepProgress = 1 - easeInCubic(t_outro);
          opacity = 1 - t_outro;
        }
        break;
      }

      default: {
        // Default fade animation fallback
        if (frame < outroStartFrame) {
          opacity = t_intro;
        } else {
          opacity = 1 - t_outro;
        }
      }
    }

    // Compute vertical alignment y-coordinate for this line
    const y = startY + lineHeights[idx] / 2 + 10; // Extra alignment shift
    startY += lineHeights[idx] + gap; // Advance Y for next line in stack

    // Apply canvas transformations
    ctx.translate(width / 2 + translateX, y);

    // Apply invisible mask clipping relative to layout center rest boundary
    if (clipMaskActive) {
      ctx.beginPath();
      // Mask allows text to draw only above its rest baseline (+line.size * 0.52 offset)
      ctx.rect(-width, -line.size * 1.5, width * 2, line.size * 2.02);
      ctx.clip();
    }

    ctx.translate(0, translateY);
    ctx.scale(scaleX, scaleY);

    if (skewX !== 0) {
      ctx.transform(1, 0, skewX, 1, 0, 0);
    }
    
    // Dynamic Monitor phosphorus screen flicker
    let flickerFactor = 1.0;
    if (options.crtFlicker) {
      flickerFactor = 0.94 + 0.06 * Math.sin(frame * 0.9) * Math.cos(frame * 0.23);
    }
    ctx.globalAlpha = opacity * flickerFactor;

    // Apply standard canvas blur if active
    if (blurPx > 0.5) {
      ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    } else {
      ctx.filter = 'none';
    }

    // Set font parameters
    const italicStr = line.italic ? 'italic' : 'normal';
    ctx.font = `${italicStr} ${line.weight || '400'} ${line.size}px "${line.font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Letter Spacing (Tracking) Support
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${currentTracking || 0}px`;
    }

    // Setup Text fill color / gradient
    const textWidth = ctx.measureText(textToDraw).width + (currentTracking || 0) * textToDraw.length;
    let textFill = line.color || '#ffffff';
    if (line.useGradient && line.gradientColors && line.gradientColors.length >= 2) {
      const grad = ctx.createLinearGradient(-textWidth / 2, 0, textWidth / 2, 0);
      
      line.gradientColors.forEach((colorObj, cIdx) => {
        grad.addColorStop(colorObj.stop, colorObj.color);
      });
      textFill = grad;
    }

    // Apply linear gradient light sweep clipping
    let x_sweep = 0;
    let sweepNeedsRestore = false;
    if (sweepActive) {
      x_sweep = (-textWidth / 2 - 25) + (textWidth + 50) * sweepProgress;
      ctx.save();
      ctx.beginPath();
      // Bounding box only covers area to the left of the sweep line
      ctx.rect(-textWidth / 2 - 60, -line.size * 2, (textWidth / 2 + 60) + x_sweep, line.size * 4);
      ctx.clip();
      sweepNeedsRestore = true;
    }

    // Render logic: either normal drawing or RGB chromatic aberration split
    const isAlertIcon = textToDraw.toUpperCase() === '[ALERT]';
    if (rgbSplitAmount > 0.5) {
      // RGB GLITCH DRAW:
      // Red Channel (Offset Left)
      ctx.save();
      const redColor = 'rgba(255, 0, 85, 0.9)';
      ctx.fillStyle = redColor;
      ctx.translate(-rgbSplitAmount, 0);
      if (isAlertIcon) {
        drawWarningTriangle(ctx, 0, 0, line.size, redColor, line);
      } else {
        drawText(ctx, textToDraw, 0, 0, line);
      }
      ctx.restore();

      // Cyan Channel (Offset Right)
      ctx.save();
      const cyanColor = 'rgba(0, 240, 255, 0.9)';
      ctx.fillStyle = cyanColor;
      ctx.translate(rgbSplitAmount, 0);
      if (isAlertIcon) {
        drawWarningTriangle(ctx, 0, 0, line.size, cyanColor, line);
      } else {
        drawText(ctx, textToDraw, 0, 0, line);
      }
      ctx.restore();

      // White overlay (Center)
      ctx.save();
      ctx.fillStyle = '#ffffff';
      if (isAlertIcon) {
        drawWarningTriangle(ctx, 0, 0, line.size, '#ffffff', line);
      } else {
        drawText(ctx, textToDraw, 0, 0, line);
      }
      ctx.restore();
    } else {
      // Normal Draw
      ctx.fillStyle = textFill;
      
      // Shadow / Glow styling
      if (line.glow && line.glowSize > 0) {
        ctx.shadowColor = line.glowColor || line.color;
        ctx.shadowBlur = line.glowSize;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else if (line.shadow) {
        ctx.shadowColor = line.shadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = line.shadowBlur || 4;
        ctx.shadowOffsetX = line.shadowX || 0;
        ctx.shadowOffsetY = line.shadowY || 2;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      if (isAlertIcon) {
        drawWarningTriangle(ctx, 0, 0, line.size, textFill, line);
      } else {
        drawText(ctx, textToDraw, 0, 0, line);
      }
    }

    if (sweepNeedsRestore) {
      ctx.restore();
      
      // Draw dynamic high-intensity vertical neon phosphor glow sweep bar
      if (sweepProgress > 0.01 && sweepProgress < 0.99) {
        ctx.save();
        const sweepColor = line.glowColor || line.color || '#00f0ff';
        const grad = ctx.createLinearGradient(x_sweep - 12, 0, x_sweep + 12, 0);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        grad.addColorStop(0.5, sweepColor);
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.95;
        ctx.filter = 'none';
        ctx.fillRect(x_sweep - 12, -line.size * 0.7, 24, line.size * 1.4);
        ctx.restore();
      }
    }

    ctx.restore();
  });

  // --- Global CRT Monitor Shaders & Overlays ---
  // 1. CRT Scanlines (Supports Horizontal, Vertical, or Grid Mesh)
  if (options.crtScanlines && options.crtScanlines !== 'none') {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = options.crtScanlineOpacity !== undefined ? options.crtScanlineOpacity : 0.35;
    
    const spacing = options.crtScanlineSpacing || 3;
    
    if (options.crtScanlines === 'horizontal' || options.crtScanlines === 'grid') {
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    if (options.crtScanlines === 'vertical' || options.crtScanlines === 'grid') {
      for (let x = 0; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 2. Vintage Glass Radial Vignette
  if (options.crtVignette) {
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.45, width / 2, height / 2, width * 0.9);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 3. Phosphor Noise Grain
  if (options.crtNoise) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const seed = frame * 11;
    for (let i = 0; i < 2500; i++) {
      const rx = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
      const ry = (Math.cos(i * 78.233 + seed) * 43758.5453) % 1;
      const pxX = Math.floor(Math.abs(rx) * width);
      const pxY = Math.floor(Math.abs(ry) * height);
      ctx.fillRect(pxX, pxY, 2, 2);
    }
    ctx.restore();
  }
}

/**
 * Text drawing helper. Handles letter-by-letter drawing fallback if browser does not support ctx.letterSpacing
 */
function drawText(ctx, text, x, y, line) {
  const tracking = line.tracking || 0;
  
  // If letterSpacing is natively supported, draw all at once
  if ('letterSpacing' in ctx) {
    ctx.fillText(text, x, y);
    return;
  }

  // Robust manual spacing fallback (essential for cross-browser consistency)
  if (tracking === 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = text.split('');
  
  // Calculate total width to center the manual text block
  let totalWidth = 0;
  const widths = chars.map(char => {
    const w = ctx.measureText(char).width;
    totalWidth += w + tracking;
    return w;
  });
  
  // Remove the trailing tracking gap from width summation
  if (chars.length > 0) totalWidth -= tracking;

  let currentX = x - totalWidth / 2;

  chars.forEach((char, index) => {
    const charWidth = widths[index];
    ctx.fillText(char, currentX + charWidth / 2, y);
    currentX += charWidth + tracking;
  });
}

/**
 * Custom sequential transition sweep engine.
 * Mimics Motion Array's 'Beginning of a video transition on alpha' style:
 * Sweeps slanted color bands across the screen while transitioning typography from "READY?" to "START!"
 */
function renderReadyStart(ctx, width, height, lines, frame, totalFrames, fps) {
  const f_ratio = frame / totalFrames;
  
  // Custom easing algorithms for extreme energetic transitions
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeInCubic = (t) => t * t * t;
  const elasticEaseOut = (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  // Draws slanted diagonal background bars
  const drawSlantedBand = (progress, bandWidth, color, slant) => {
    const x_start = -width - slant;
    const x_end = width + slant;
    const x_center = x_start + progress * (x_end - x_start);
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x_center - bandWidth / 2, 0);
    ctx.lineTo(x_center + bandWidth / 2, 0);
    ctx.lineTo(x_center + bandWidth / 2 - slant, height);
    ctx.lineTo(x_center - bandWidth / 2 - slant, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Phase 1: Draw Text 1 ("READY?")
  // Renders from frame start until the transition bands sweep over (f_ratio < 0.52)
  if (f_ratio < 0.52 && lines.length > 0) {
    const line = lines[0];
    ctx.save();
    
    // Intro: rapid bounce scale pop-in (first 18% of duration)
    let t_intro = Math.min(1, f_ratio / 0.18);
    let scale = elasticEaseOut(t_intro);
    let opacity = t_intro;
    
    // Outro: rapid slide-out to the left as the banners cover it
    let translateX = 0;
    if (f_ratio > 0.35) {
      const t_out = (f_ratio - 0.35) / 0.12;
      translateX = -width * 0.7 * easeInCubic(Math.min(1, t_out));
      opacity = Math.max(0, 1 - t_out);
    }
    
    let textToDraw = line.text;
    if (line.transform === 'uppercase') textToDraw = textToDraw.toUpperCase();
    if (line.transform === 'lowercase') textToDraw = textToDraw.toLowerCase();

    ctx.translate(width / 2 + translateX, height / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;
    
    // Render text with specific line parameters
    const italicStr = line.italic ? 'italic' : 'normal';
    ctx.font = `${italicStr} ${line.weight || '800'} ${line.size}px "${line.font}"`;
    ctx.fillStyle = line.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${line.tracking || 0}px`;
    }
    
    // Applied shadows
    if (line.glow && line.glowSize > 0) {
      ctx.shadowColor = line.glowColor || line.color;
      ctx.shadowBlur = line.glowSize;
    } else if (line.shadow) {
      ctx.shadowColor = line.shadowColor;
      ctx.shadowBlur = line.shadowBlur;
      ctx.shadowOffsetX = line.shadowX;
      ctx.shadowOffsetY = line.shadowY;
    }
    
    ctx.fillText(textToDraw, 0, 0);
    ctx.restore();
  }

  // Phase 2: Render Sweeping Slanted Transition Banners
  // These completely wipe the screen, covering the cuts in editing
  const slant = 260; // Slanted degree ratio
  
  // Band 1 (Cyan - #06b6d4): Sweeps early
  const b1_start = 0.18;
  const b1_end = 0.58;
  if (f_ratio >= b1_start && f_ratio <= b1_end) {
    const progress = easeInOutCubic((f_ratio - b1_start) / (b1_end - b1_start));
    drawSlantedBand(progress, width * 0.9, '#06b6d4', slant);
  } else if (f_ratio > b1_end && f_ratio < 0.65) {
    drawSlantedBand(1, width * 0.9, '#06b6d4', slant);
  }

  // Band 2 (Violet - #8b5cf6): Extra wide, guarantees full coverage
  const b2_start = 0.23;
  const b2_end = 0.63;
  if (f_ratio >= b2_start && f_ratio <= b2_end) {
    const progress = easeInOutCubic((f_ratio - b2_start) / (b2_end - b2_start));
    drawSlantedBand(progress, width * 1.4, '#8b5cf6', slant);
  } else if (f_ratio > b2_end && f_ratio < 0.68) {
    drawSlantedBand(1, width * 1.4, '#8b5cf6', slant);
  }

  // Band 3 (White - #ffffff): Final trailing band
  const b3_start = 0.28;
  const b3_end = 0.68;
  if (f_ratio >= b3_start && f_ratio <= b3_end) {
    const progress = easeInOutCubic((f_ratio - b3_start) / (b3_end - b3_start));
    drawSlantedBand(progress, width * 0.9, '#ffffff', slant);
  }

  // Phase 3: Draw Text 2 ("START!")
  // Renders after the screen coverage wipe begins clearing (f_ratio >= 0.44)
  const line2Idx = lines.length > 1 ? 1 : 0;
  if (f_ratio >= 0.44 && lines.length > 0) {
    const line = lines[line2Idx];
    ctx.save();
    
    // Intro: elastic bounce expansion as the banners sweep off
    let t_intro = Math.min(1, (f_ratio - 0.44) / 0.18);
    let scale = elasticEaseOut(t_intro);
    let opacity = t_intro;
    
    // Outro: slides down and fades out in the final stretch
    let translateY = 0;
    if (f_ratio > 0.82) {
      const t_out = (f_ratio - 0.82) / 0.14;
      translateY = 60 * easeInCubic(Math.min(1, t_out));
      opacity = Math.max(0, 1 - t_out);
    }
    
    let textToDraw = line.text;
    if (line.transform === 'uppercase') textToDraw = textToDraw.toUpperCase();
    if (line.transform === 'lowercase') textToDraw = textToDraw.toLowerCase();

    ctx.translate(width / 2, height / 2 + translateY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;
    
    const italicStr = line.italic ? 'italic' : 'normal';
    ctx.font = `${italicStr} ${line.weight || '900'} ${line.size}px "${line.font}"`;
    
    // Setup gradient/solid color for Text 2
    let textFill = line.color || '#06b6d4';
    if (line.useGradient && line.gradientColors && line.gradientColors.length >= 2) {
      const textWidth = ctx.measureText(textToDraw).width + (line.tracking || 0) * textToDraw.length;
      const grad = ctx.createLinearGradient(-textWidth / 2, 0, textWidth / 2, 0);
      line.gradientColors.forEach(colorObj => grad.addColorStop(colorObj.stop, colorObj.color));
      textFill = grad;
    }
    ctx.fillStyle = textFill;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${line.tracking || 0}px`;
    }
    
    // Render glow or shadow
    if (line.glow && line.glowSize > 0) {
      ctx.shadowColor = line.glowColor || line.color;
      ctx.shadowBlur = line.glowSize;
    } else if (line.shadow) {
      ctx.shadowColor = line.shadowColor;
      ctx.shadowBlur = line.shadowBlur;
      ctx.shadowOffsetX = line.shadowX;
      ctx.shadowOffsetY = line.shadowY;
    }
    
    ctx.fillText(textToDraw, 0, 0);
    ctx.restore();
  }
}

/**
 * Draws a gorgeous vector retro warning alert triangle mathematically on the canvas.
 * Seamlessly inherits glows, shadows, and scanlines.
 */
function drawWarningTriangle(ctx, x, y, size, fillStyle, line) {
  ctx.save();
  ctx.strokeStyle = fillStyle;
  ctx.lineWidth = size * 0.11;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Triangle path: slightly rounded corners
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.45);
  ctx.lineTo(x + size * 0.52, y + size * 0.42);
  ctx.lineTo(x - size * 0.52, y + size * 0.42);
  ctx.closePath();
  ctx.stroke();
  
  // Draw blocky retro exclamation mark '!' inside using canvas rects
  ctx.fillStyle = fillStyle;
  
  // Exclamation point stem
  ctx.fillRect(x - size * 0.045, y - size * 0.14, size * 0.09, size * 0.24);
  // Exclamation point dot
  ctx.fillRect(x - size * 0.045, y + size * 0.18, size * 0.09, size * 0.09);
  
  ctx.restore();
}

