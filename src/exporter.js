import JSZip from 'jszip';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { renderFrame } from './canvasRenderer';

/**
 * Exports the animated title as a ZIP archive of transparent PNG frames.
 * Optimal professional workflow for Final Cut Pro.
 */
export async function exportPNGSequence(lines, animationStyle, totalFrames, fps, resolution, onProgress, extraOptions = {}) {
  const zip = new JSZip();
  
  // Create hidden virtual canvas at full target resolution (e.g. 1920x1080 or 3840x2160)
  const virtualCanvas = document.createElement('canvas');
  virtualCanvas.width = resolution.width;
  virtualCanvas.height = resolution.height;
  
  const folder = zip.folder('title_sequence');
  
  for (let frame = 0; frame < totalFrames; frame++) {
    // Render frame to virtual canvas
    renderFrame(virtualCanvas, lines, animationStyle, frame, totalFrames, fps, { bgType: 'transparent', ...extraOptions });
    
    // Capture canvas as a PNG blob
    const blob = await new Promise(resolve => {
      virtualCanvas.toBlob(resolve, 'image/png');
    });
    
    // Pad frame index (e.g., frame_003.png)
    const frameName = `frame_${String(frame).padStart(3, '0')}.png`;
    folder.file(frameName, blob);
    
    // Report progress (up to 85% for rendering, reserve remaining for zip compilation)
    onProgress(Math.round((frame / totalFrames) * 85));
    
    // Yield to main UI thread to prevent browser lockup
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Generate the ZIP file asynchronously
  onProgress(90);
  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    // Optionally trace zip progress
  });
  
  onProgress(100);
  return zipBlob;
}

/**
 * Exports the animated title as a transparent GIF.
 * Uses gifenc with customized color mapping to support clean binary transparency.
 */
export async function exportGIF(lines, animationStyle, totalFrames, fps, resolution, onProgress, extraOptions = {}) {
  // Cap GIF size at a maximum width of 960px to maintain speed and avoid massive file sizes
  const maxGifWidth = 960;
  const scale = Math.min(1, maxGifWidth / resolution.width);
  const gifWidth = Math.round(resolution.width * scale);
  const gifHeight = Math.round(resolution.height * scale);
  
  const virtualCanvas = document.createElement('canvas');
  virtualCanvas.width = gifWidth;
  virtualCanvas.height = gifHeight;
  const ctx = virtualCanvas.getContext('2d');
  
  const gif = new GIFEncoder();
  gif.start();
  
  const delayMs = Math.round(1000 / fps);
  
  for (let frame = 0; frame < totalFrames; frame++) {
    // Render frame to virtual canvas
    renderFrame(virtualCanvas, lines, animationStyle, frame, totalFrames, fps, { bgType: 'transparent', ...extraOptions });
    
    // Extract RGBA buffer
    const imgData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    const { data } = imgData;
    
    // Map translucent pixels to binary opacity to avoid ugly GIF halo boundaries
    const rgba = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 120) {
        // Pixel is transparent: map to black key transparent color [0,0,0,0]
        rgba[i] = 0;
        rgba[i + 1] = 0;
        rgba[i + 2] = 0;
        rgba[i + 3] = 0;
      } else {
        // Pixel is opaque: keep color and clamp alpha to 255
        rgba[i] = data[i];
        rgba[i + 1] = data[i + 1];
        rgba[i + 2] = data[i + 2];
        rgba[i + 3] = 255;
      }
    }
    
    // Run color quantization
    const palette = quantize(rgba, 256, { format: 'rgba4444' });
    
    // Explicitly reserve index 0 for transparent pixels
    palette[0] = [0, 0, 0, 0];
    
    // Create indexed frame bitmap
    const index = applyPalette(rgba, palette, 'rgba4444');
    
    // Manually force transparent index for modified pixels
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] === 0) {
        index[i / 4] = 0;
      }
    }
    
    // Write GIF frame
    gif.writeFrame(index, gifWidth, gifHeight, {
      palette,
      transparent: true,
      transparentIndex: 0,
      delay: delayMs
    });
    
    onProgress(Math.round((frame / totalFrames) * 98));
    
    // Yield to main UI thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  gif.finish();
  const buffer = gif.bytesView();
  const gifBlob = new Blob([buffer], { type: 'image/gif' });
  
  onProgress(100);
  return gifBlob;
}

/**
 * Records canvas frame-by-frame to a video container in real-time.
 * Supports WebM with alpha (Chrome/Firefox/Edge) or chroma key (green screen) outputs.
 */
export function recordCanvasVideo(lines, animationStyle, totalFrames, fps, resolution, bgType, bgColor, onProgress, extraOptions = {}) {
  return new Promise((resolve, reject) => {
    // Create high-res virtual canvas for video recording
    const virtualCanvas = document.createElement('canvas');
    virtualCanvas.width = resolution.width;
    virtualCanvas.height = resolution.height;
    
    // Render first frame immediately before stream capture
    renderFrame(virtualCanvas, lines, animationStyle, 0, totalFrames, fps, { bgType, bgColor, ...extraOptions });
    
    const stream = virtualCanvas.captureStream(fps);
    
    // Check supported WebM codecs for transparency
    let mimeType = 'video/webm';
    if (bgType === 'transparent') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      }
    } else {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      }
    }
    
    const options = { mimeType };
    let recorder;
    
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.warn(`MediaRecorder custom options rejected. Using browser default.`, e);
      recorder = new MediaRecorder(stream);
    }
    
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: recorder.mimeType });
      resolve(videoBlob);
    };
    
    recorder.onerror = (e) => {
      reject(e);
    };
    
    // Begin recording
    recorder.start();
    
    let currentFrame = 0;
    const frameIntervalMs = 1000 / fps;
    
    const renderTimer = setInterval(() => {
      // Draw frame to recording canvas
      renderFrame(virtualCanvas, lines, animationStyle, currentFrame, totalFrames, fps, { bgType, bgColor, ...extraOptions });
      
      currentFrame++;
      onProgress(Math.round((currentFrame / totalFrames) * 98));
      
      if (currentFrame >= totalFrames) {
        clearInterval(renderTimer);
        // Wait a slight cushion to ensure the final frame buffers into the MediaRecorder
        setTimeout(() => {
          try {
            recorder.stop();
          } catch (err) {
            reject(err);
          }
        }, 150);
      }
    }, frameIntervalMs);
  });
}
