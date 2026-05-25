# Implementation Plan - 5 New Motion Style Presets in the Kinetic Animation Engine

We are reverting the 5 visual templates from `src/templates.js` and instead implementing **5 new advanced mathematical animation transition presets** inside the **kinetic animation engine** (`canvasRenderer.js`). 

These new styles will provide dynamic, frame-perfect math animations (zooms, masks, shears, sweeps, and expansions) that can be selected for any title stack.

---

## Proposed Kinetic Animation Designs (canvasRenderer.js)

The following 5 animation styles will be added to the `switch (animationStyle)` block in `renderFrame()` inside [canvasRenderer.js](file:///Users/davvyk/git/titleGen/src/canvasRenderer.js):

### 1. `scale-overshoot` (Spring Zoom Pop)
A spring-cushioned zoom. Text shoots in from `0` scale, overshoots its natural boundaries, and elastically bounces back to settle at its final scale.
*   **Intro Math**:
    *   `p = elasticEaseOut(t_intro)`
    *   `scaleX = scaleY = p`
    *   `opacity = Math.min(1, t_intro * 3.0)`
*   **Outro Math**:
    *   `p = easeInBack(t_outro)`
    *   `scaleX = scaleY = 1 - p`
    *   `opacity = 1 - p`

### 2. `mask-reveal` (Invisible Bounded Slide)
Commercial lower-third wipe. Text slides up from an invisible boundary line, rendering only when it is above the mask region.
*   **Intro Math**:
    *   `translateY = line.size * 1.3 * (1 - easeOutCubic(t_intro))`
    *   `opacity = t_intro`
    *   **Clipping Logic**: Creates a bounding mask box before drawing text.
        ```javascript
        ctx.beginPath();
        ctx.rect(-width / 2, -line.size * 0.8, width, line.size * 1.6);
        ctx.clip();
        ```
*   **Outro Math**:
    *   Text slides back down behind the clipping line: `translateY = line.size * 1.3 * easeInCubic(t_outro)`.

### 3. `skew-slide` (Velocity Sheared Drift)
Kinetic typography drift. Text slides in horizontally while skewed/sheared at an angle, dynamically straightening up as it decelerates.
*   **Intro Math**:
    *   `fromLeft = idx % 2 === 0`
    *   `translateX = (fromLeft ? -250 : 250) * (1 - easeOutExpo(t_intro))`
    *   `skewX = (fromLeft ? -0.4 : 0.4) * (1 - easeOutCubic(t_intro))`
    *   **Transformation Matrix**: `ctx.transform(1, 0, skewX, 1, 0, 0)`
*   **Outro Math**:
    *   Slides out rapidly in the opposite direction while applying a reverse skew slant.

### 4. `tracking-expand` (Cinematic Letter Expander)
A high-end cinematic title breathe. Letters start tightly compressed (near-negative spacing) and expand outwards gracefully while fading in.
*   **Intro/Hold Math**:
    *   `p = easeOutExpo(t_intro)`
    *   `currentTracking = -6 + (line.tracking + 10) * p` (overrides line tracking parameter)
    *   `opacity = p`
    *   `blurPx = 8 * (1 - p)`
*   **Outro Math**:
    *   Expands wider: `currentTracking = targetTracking + 15 * t_outro` while fading and blurring out.

### 5. `light-sweep` (Phosphor Glow Sweep)
Retro computer scan reveal. A high-glow vertical gradient sweeps horizontally from left to right across the text width, revealing the letters as it passes.
*   **Intro Math**:
    *   `p = easeOutCubic(t_intro)`
    *   `opacity = t_intro`
    *   **Revealing Clipping Gradient**: Replaces the canvas clip with a sweeping bounding box based on text width, adding a vertical glow strip along the edge.

---

## Component Updates

### [MODIFY] [templates.js](file:///Users/davvyk/git/titleGen/src/templates.js)
*   Revert the 5 visual templates (`luxury-gold`, `vaporwave-retro`, `sport-championship`, `cosmic-terminal`, `broadcasting-news`) to return the visual database to its approved, clean baseline state.

### [MODIFY] [canvasRenderer.js](file:///Users/davvyk/git/titleGen/src/canvasRenderer.js)
*   Inject the 5 new transition options in the `switch (animationStyle)` block inside `renderFrame()`.
*   Implement `scale-overshoot`, `mask-reveal`, `skew-slide`, `tracking-expand`, and `light-sweep` mathematical animations.

### [MODIFY] [App.jsx](file:///Users/davvyk/git/titleGen/src/App.jsx)
*   Add the 5 new presets to the Animation Style selection dropdown:
    *   `scale-overshoot` (Spring Zoom Pop)
    *   `mask-reveal` (Invisible Mask Slide)
    *   `skew-slide` (Velocity Skew)
    *   `tracking-expand` (Cinematic Expander)
    *   `light-sweep` (Glow Wipe Sweep)

---

## Verification Plan

### Manual Layout Inspection
*   Scrub the timeline transport in the browser to audit frame-by-frame mathematical scaling, shearing, expansions, and clipping boundaries.
*   Ensure the bounding box mask in `mask-reveal` adapts perfectly to different font sizes without cutting off glyph ascenders/descenders.

### Build Verification
*   Compile with `npm run build` to confirm zero JSX/ESLint syntax errors.
