# MotionTitle Generator - Complete Walkthrough & Usage Guide

MotionTitle is a browser-based, high-end motion graphic title and caption generator built specifically to address the frustrations of video editors. It outputs beautiful, transparent-background or chroma-keyed animated titles that can be dropped directly into timelines like Final Cut Pro, Premiere, and CapCut.

---

## File Architecture

Here is the clean and optimized project structure created in your workspace:

*   [index.css](file:///Users/davvyk/git/titleGen/src/index.css): Core glassmorphic theme system, custom scrollbars, dashboard panel, timeline sliders, and exporter progress cards.
*   [fonts.js](file:///Users/davvyk/git/titleGen/src/fonts.js): Google Fonts preloader. Registry of 18 high-end display, serif, and sans-serif typefaces. Asynchronously fetches stylesheets and monitors cache states before drawing.
*   [templates.js](file:///Users/davvyk/git/titleGen/src/templates.js): The pre-designed templates library, packaging 8 gorgeous layouts (including Serifs, Cyber Neon, Editorial Vogue, Bold Kinetic, Modern Clean, Retro Arcade, Retro CRT Warning, and CRT System Terminal).
*   [canvasRenderer.js](file:///Users/davvyk/git/titleGen/src/canvasRenderer.js): The math-based, frame-perfect canvas drawing engine. Translates timeline frame coordinates into eased animations (slides, pops, typewriter, glitches, staggering, spring zoom overshoots, invisible mask wipes, velocity shear/skews, tracking letter spacing expanders, and neon phosphor sweeps).
*   [exporter.js](file:///Users/davvyk/git/titleGen/src/exporter.js): File compiler. Packs PNG frames using `JSZip`, quantizes 8-bit transparent GIFs using `gifenc`, and records real-time WebM with alpha or solid chroma key colors.
*   [App.jsx](file:///Users/davvyk/git/titleGen/src/App.jsx): The main React interface connecting state controls to drawing loops, timeline transport groups, and rendering modals.

---

## Key Technical Features

### 1. Deterministic Frame Rendering
Rather than trying to capture active CSS transitions or recording real-time canvas animation loops (which drop frames due to CPU spikes and trigger choppy files), our engine uses a **mathematical canvas frame timeline**.
If your animation is configured to be 4 seconds at 30 FPS, there are exactly 120 individual frames. When you click **Export**, the renderer loops through frames `0` to `119` sequentially, draws the canvas state, and packs the frame. This guarantees that your output is **100% smooth, frame-perfect, and free of stuttering**, regardless of hardware speed.

### 2. Double-staggered Animations
To make the text feel premium and professional, each line is rendered with a staggered start:
- Line 1 (Main Title) pops, slides, or blurs in first.
- Line 2 (Sub-caption) is offset by a slight delay (e.g. 0.25s) to create an organic flow.
- During "Cushion Bounce", lines cushion-decelerate in opposite directions (Line 1 from left, Line 2 from right) to mimic high-end broadcast television lower thirds.

### 3. Smart Font Preloading
Whenever a template is selected or a font is changed, the `FontManager` triggers a cache fetch from the Google Fonts API. It locks further rendering until the browser's `document.fonts.load()` resolves, completely preventing system fallbacks or visual jittering.

### 4. Retro CRT Monitor Simulation
To support authentic vintage computer and arcade screen aesthetics, we built a hardware-accurate CRT simulator into the canvas drawing engine:
- **Raster Scanlines**: Draws sharp black horizontal raster lines (Image 2/3), vertical raster lines (Image 1), or a grid mesh directly on top of all canvas visual content. Spacing (gap width) and opacity (strength) are fully adjustable.
- **Dynamic Phosphorus Flicker**: Simulates high-frequency tube current ripples by mathematically vibrating the overall transparency frame-by-frame, creating a vintage phosphor tube glow.
- **Rounded Vignette Masking**: Renders a custom radial gradient overlay that fades to deep black near the corners, emulating a retro curved glass monitor surface.
- **Analog Static Noise Grain**: Scatters dynamic gray noise pixels across the canvas, generating organic retro grain texture that shifts frame-by-frame.
- **Chromatic aberration gun misalignment**: Shifts the Red and Cyan color channels slightly to mimic misaligned electron guns in vintage color CRT displays. *(Fixed: Baseline chromatic aberration is now driven directly by the Gun Alignment slider across all presets, with extra dynamic aberration spikes added during active cyber-glitch phases!)*
- **Blocky Alert Symbols `[ALERT]`**: Typing `[ALERT]` in any text field renders a vector warning alert triangle mathematically. Rather than drawing soft anti-aliased font glyphs, the internal exclamation mark `!` is drawn with blocky rectangular fills to replicate authentic vintage pixelated arcade alert displays.

---

## Final Cut Pro (FCP) Workflows

Because FCP does not natively support WebM transparency out of the box, we have built the three best industry-standard workflows directly into this tool:

### Workflow A: The PNG Sequence (ZIP) — *Recommended for Highest Quality*
1. Set your resolution and click **ZIP** on the export tab.
2. Unzip the downloaded folder to get a sequence of transparent PNG files (e.g., `frame_000.png` to `frame_120.png`).
3. In **Final Cut Pro**, go to Preferences > Playback, and change **Player Background** to **Checkerboard** (so you can see your transparency!).
4. Import the folder or select all PNG files in Finder and drag them directly onto your FCP timeline.
5. With all frames selected on the timeline, press `Control + D` (Change Duration), type `1` (for 1 frame), and hit `Enter`.
6. Press `Option + G` (New Compound Clip), name it, and press `Enter`.
7. You now have a single, easy-to-manage, **flawless 8-bit alpha transparent title clip** with smooth anti-aliased shadows and beautiful text edges!

### Workflow B: The Chroma Key (MOV) — *Recommended for Quick Speed*
1. Set the top-right header background toggle to **Green** (Chroma Green screen) or **Blue**.
2. Go to the Export tab and click **MOV** next to "Green Screen".
3. Drag the exported video directly onto your FCP timeline over your footage.
4. Go to the FCP **Effects Browser**, find the **Keyer** effect, and drag it onto your green screen title clip.
5. FCP will automatically key out the green, leaving your clean, anti-aliased animated titles perfectly positioned over your video.

### Workflow C: Transparent WebM / GIFs — *For Other Editors & Web Apps*
- **Transparent WebM** is natively supported by DaVinci Resolve, Adobe Premiere, CapCut, and OBS. If you use those, you can drag and drop the WebM file directly without any keying or frame-rate conversions!
- **Transparent GIF** uses a low-level encoder that clips semi-transparent margins to avoid black halos. It is capped at 960px width for fast loads.

---

## Verification Results

The application compile-checks and builds perfectly:
- **Build Output**: A fully compressed single-page static bundle is output to `dist/`.
- **Performance**: Zero external server APIs required for operation (except loading fonts on first select), making it extremely fast, secure, and entirely client-side.
