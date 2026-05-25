import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles, 
  Type, 
  Sliders, 
  Video, 
  Image, 
  Loader2,
  Tv,
  ArrowUp,
  ArrowDown,
  Palette,
  Eye
} from 'lucide-react';

import { GOOGLE_FONTS, loadGoogleFont } from './fonts';
import { TYPOGRAPHY_TEMPLATES } from './templates';
import { renderFrame } from './canvasRenderer';
import { exportPNGSequence, exportGIF, recordCanvasVideo } from './exporter';

function App() {
  // --- Core State ---
  const [lines, setLines] = useState(TYPOGRAPHY_TEMPLATES[0].lines);
  const [selectedTemplate, setSelectedTemplate] = useState(TYPOGRAPHY_TEMPLATES[0].id);
  const [animationStyle, setAnimationStyle] = useState(TYPOGRAPHY_TEMPLATES[0].animation);
  const [duration, setDuration] = useState(TYPOGRAPHY_TEMPLATES[0].duration);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState({ width: 1920, height: 1080, name: '1080p Full HD' });
  const [bgType, setBgType] = useState('transparent'); // transparent, green, blue, color
  const [bgColor, setBgColor] = useState('#000000');
  
  // CRT Simulator State
  const [crtScanlines, setCrtScanlines] = useState('none'); // none, horizontal, vertical, grid
  const [crtScanlineOpacity, setCrtScanlineOpacity] = useState(0.35);
  const [crtScanlineSpacing, setCrtScanlineSpacing] = useState(3);
  const [crtChromaticAberration, setCrtChromaticAberration] = useState(0);
  const [crtFlicker, setCrtFlicker] = useState(false);
  const [crtVignette, setCrtVignette] = useState(false);
  const [crtNoise, setCrtNoise] = useState(false);
  
  // UI Tabs: templates, lines, settings, export
  const [activeTab, setActiveTab] = useState('templates');
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  
  // Transport (Playback) State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  
  // Assets Load State
  const [fontsLoading, setFontsLoading] = useState(false);
  
  // Export Modal State
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState('');
  
  // Canvas References
  const canvasRef = useRef(null);
  const playAnimationRef = useRef(null);
  const lastTimeRef = useRef(0);

  const totalFrames = Math.floor(duration * fps);

  // --- Resolution Presets ---
  const RESOLUTION_PRESETS = [
    { name: '1080p Full HD (16:9)', width: 1920, height: 1080 },
    { name: '4K Ultra HD (16:9)', width: 3840, height: 2160 },
    { name: 'Social Post (1:1)', width: 1080, height: 1080 },
    { name: 'Shorts/TikTok (9:16)', width: 1080, height: 1920 }
  ];

  // --- Dynamic Google Fonts preloader ---
  const preloadAllFonts = async (textLines) => {
    setFontsLoading(true);
    const loadPromises = textLines.map(line => loadGoogleFont(line.font));
    await Promise.all(loadPromises);
    setFontsLoading(false);
    triggerRedraw();
  };

  // Preload fonts when lines or templates change
  useEffect(() => {
    preloadAllFonts(lines);
  }, [lines]);

  // --- Playback Loop Engine ---
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      
      const frameInterval = 1000 / fps;
      let accumulator = 0;

      const animate = (time) => {
        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;
        accumulator += delta;

        let framesToAdvance = 0;
        while (accumulator >= frameInterval) {
          framesToAdvance++;
          accumulator -= frameInterval;
        }

        if (framesToAdvance > 0) {
          setCurrentFrame(prev => {
            const nextFrame = prev + framesToAdvance;
            if (nextFrame >= totalFrames) {
              return 0; // Loop playback
            }
            return nextFrame;
          });
        }

        playAnimationRef.current = requestAnimationFrame(animate);
      };

      playAnimationRef.current = requestAnimationFrame(animate);
    } else {
      if (playAnimationRef.current) {
        cancelAnimationFrame(playAnimationRef.current);
      }
    }

    return () => {
      if (playAnimationRef.current) {
        cancelAnimationFrame(playAnimationRef.current);
      }
    };
  }, [isPlaying, fps, totalFrames]);

  // Trigger canvas redraw on frame change or render variable shifts
  const triggerRedraw = () => {
    if (canvasRef.current) {
      renderFrame(
        canvasRef.current, 
        lines, 
        animationStyle, 
        currentFrame, 
        totalFrames, 
        fps, 
        { 
          bgType, 
          bgColor,
          crtScanlines,
          crtScanlineOpacity,
          crtScanlineSpacing,
          crtChromaticAberration,
          crtFlicker,
          crtVignette,
          crtNoise
        }
      );
    }
  };

  useEffect(() => {
    triggerRedraw();
  }, [
    currentFrame, 
    lines, 
    animationStyle, 
    duration, 
    fps, 
    resolution, 
    bgType, 
    bgColor, 
    fontsLoading,
    crtScanlines,
    crtScanlineOpacity,
    crtScanlineSpacing,
    crtChromaticAberration,
    crtFlicker,
    crtVignette,
    crtNoise
  ]);

  // --- User Template Selection Trigger ---
  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setLines(tpl.lines);
    setAnimationStyle(tpl.animation);
    setDuration(tpl.duration);
    
    // Custom CRT fields override or reset to defaults
    setCrtScanlines(tpl.crtScanlines || 'none');
    setCrtScanlineOpacity(tpl.crtScanlineOpacity !== undefined ? tpl.crtScanlineOpacity : 0.35);
    setCrtScanlineSpacing(tpl.crtScanlineSpacing || 3);
    setCrtChromaticAberration(tpl.crtAberration !== undefined ? tpl.crtAberration : 0);
    setCrtFlicker(tpl.crtFlicker !== undefined ? tpl.crtFlicker : false);
    setCrtVignette(tpl.crtVignette !== undefined ? tpl.crtVignette : false);
    setCrtNoise(tpl.crtNoise !== undefined ? tpl.crtNoise : false);
    
    if (tpl.bgType) {
      setBgType(tpl.bgType);
      if (tpl.bgColor) setBgColor(tpl.bgColor);
    } else {
      setBgType('transparent'); // Default back to transparent
    }
    
    setCurrentFrame(0);
    setIsPlaying(false);
    setActiveLineIdx(0);
  };

  // --- Lines CRUD Operations ---
  const handleAddLine = () => {
    const newLine = {
      text: 'New Overlay Line',
      font: 'Outfit',
      size: 40,
      weight: '500',
      italic: false,
      transform: 'none',
      color: '#ffffff',
      tracking: 2,
      useGradient: false,
      gradientColors: [
        { stop: 0, color: '#a78bfa' },
        { stop: 1, color: '#06b6d4' }
      ],
      glow: false,
      glowColor: '#8b5cf6',
      glowSize: 10,
      shadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowBlur: 4,
      shadowX: 0,
      shadowY: 2
    };
    const updated = [...lines, newLine];
    setLines(updated);
    setActiveLineIdx(updated.length - 1);
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleRemoveLine = (idx, e) => {
    e.stopPropagation();
    if (lines.length <= 1) return; // Keep at least one line
    const updated = lines.filter((_, i) => i !== idx);
    setLines(updated);
    setActiveLineIdx(Math.max(0, idx - 1));
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleUpdateLine = (idx, field, value) => {
    const updated = lines.map((line, i) => {
      if (i === idx) {
        return { ...line, [field]: value };
      }
      return line;
    });
    setLines(updated);
  };

  const handleMoveLine = (idx, direction, e) => {
    e.stopPropagation();
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === lines.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...lines];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setLines(updated);
    setActiveLineIdx(targetIdx);
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  // --- Export File Downloads Trigger ---
  const handleTriggerExport = async (format) => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setExporting(true);
    setExportFormat(format);
    setExportProgress(0);

    const crtOptions = {
      crtScanlines,
      crtScanlineOpacity,
      crtScanlineSpacing,
      crtChromaticAberration,
      crtFlicker,
      crtVignette,
      crtNoise
    };

    try {
      let downloadBlob;
      let filename = `title_${animationStyle}_${resolution.width}x${resolution.height}`;

      if (format === 'png-zip') {
        downloadBlob = await exportPNGSequence(
          lines, 
          animationStyle, 
          totalFrames, 
          fps, 
          resolution, 
          setExportProgress,
          crtOptions
        );
        filename += '_sequence.zip';
      } else if (format === 'transparent-gif') {
        downloadBlob = await exportGIF(
          lines, 
          animationStyle, 
          totalFrames, 
          fps, 
          resolution, 
          setExportProgress,
          crtOptions
        );
        filename += '_transparent.gif';
      } else if (format === 'transparent-webm') {
        downloadBlob = await recordCanvasVideo(
          lines, 
          animationStyle, 
          totalFrames, 
          fps, 
          resolution, 
          'transparent', 
          '', 
          setExportProgress,
          crtOptions
        );
        filename += '_transparent.webm';
      } else if (format === 'chroma-green' || format === 'chroma-blue') {
        const bgTypeKey = format === 'chroma-green' ? 'green' : 'blue';
        const colorVal = format === 'chroma-green' ? '#00ff00' : '#0000ff';
        downloadBlob = await recordCanvasVideo(
          lines, 
          animationStyle, 
          totalFrames, 
          fps, 
          resolution, 
          bgTypeKey, 
          colorVal, 
          setExportProgress,
          crtOptions
        );
        filename += `_chromakey_${bgTypeKey}.webm`;
      }

      if (downloadBlob) {
        const downloadUrl = URL.createObjectURL(downloadBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (e) {
      console.error('Export operations crash:', e);
      alert('An error occurred during canvas export: ' + e.message);
    } finally {
      setExporting(false);
      setCurrentFrame(0);
    }
  };

  return (
    <>
      {/* Sleek App Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="brand-name">MotionTitle</span>
          <span className="brand-badge">PRO v1.0</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="segmented-control">
            <button 
              className={`segment-btn ${bgType === 'transparent' ? 'active' : ''}`}
              onClick={() => setBgType('transparent')}
              title="Checkerboard Transparent Backdrop"
            >
              Transparent
            </button>
            <button 
              className={`segment-btn ${bgType === 'green' ? 'active' : ''}`}
              onClick={() => setBgType('green')}
              title="Chroma Key Green Screen Backdrop"
            >
              Green
            </button>
            <button 
              className={`segment-btn ${bgType === 'blue' ? 'active' : ''}`}
              onClick={() => setBgType('blue')}
              title="Chroma Key Blue Screen Backdrop"
            >
              Blue
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <div className="dashboard">
        
        {/* Left Side: Sidebar Configurator */}
        <aside className="sidebar">
          <nav className="sidebar-tab-nav">
            <button 
              className={`sidebar-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Tv size={16} /> Presets
            </button>
            <button 
              className={`sidebar-tab-btn ${activeTab === 'lines' ? 'active' : ''}`}
              onClick={() => setActiveTab('lines')}
            >
              <Type size={16} /> Text
            </button>
            <button 
              className={`sidebar-tab-btn ${activeTab === 'animation' ? 'active' : ''}`}
              onClick={() => setActiveTab('animation')}
            >
              <Sliders size={16} /> Motion
            </button>
            <button 
              className={`sidebar-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              <Download size={16} /> Export
            </button>
          </nav>

          <div className="sidebar-content">
            
            {/* TAB: TEMPLATES */}
            {activeTab === 'templates' && (
              <div>
                <h3 className="section-title"><Tv size={16} className="text-violet-400" /> Professional Presets</h3>
                <p className="sidebar-tab-btn" style={{ padding: 0, justifyContent: 'flex-start', fontSize: '0.85rem', marginBottom: '16px', cursor: 'default' }}>
                  Select a template block to initialize standard dynamic typography layouts.
                </p>
                <div className="templates-grid">
                  {TYPOGRAPHY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      className={`template-card ${selectedTemplate === tpl.id ? 'active' : ''}`}
                      onClick={() => handleSelectTemplate(tpl)}
                    >
                      <span className="template-name">{tpl.name}</span>
                      <span className="template-desc">{tpl.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TEXT LINES */}
            {activeTab === 'lines' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 className="section-title"><Type size={16} className="text-violet-400" /> Stacking Overlay Lines</h3>
                  <div className="lines-list">
                    {lines.map((line, idx) => (
                      <div 
                        key={idx} 
                        className={`line-item-card ${activeLineIdx === idx ? 'active' : ''}`}
                        onClick={() => setActiveLineIdx(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="line-header">
                          <span className="line-title">
                            <Type size={12} /> LINE {idx + 1}
                          </span>
                          <div className="line-actions">
                            <button 
                              className="action-btn move-btn" 
                              onClick={(e) => handleMoveLine(idx, 'up', e)}
                              disabled={idx === 0}
                              title="Move Line Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              className="action-btn move-btn" 
                              onClick={(e) => handleMoveLine(idx, 'down', e)}
                              disabled={idx === lines.length - 1}
                              title="Move Line Down"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              className="action-btn" 
                              onClick={(e) => handleRemoveLine(idx, e)}
                              disabled={lines.length <= 1}
                              title="Delete Line"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {activeLineIdx === idx && (
                          <div className="line-body" onClick={(e) => e.stopPropagation()}>
                            {/* Text Input */}
                            <div className="control-group">
                              <label className="control-label">Text Entry</label>
                              <input 
                                type="text"
                                className="text-input"
                                value={line.text}
                                onChange={(e) => handleUpdateLine(idx, 'text', e.target.value)}
                              />
                            </div>

                            {/* Font and Weights */}
                            <div className="control-grid-2">
                              <div className="control-group">
                                <label className="control-label">Font Family</label>
                                <select 
                                  className="select-input"
                                  value={line.font}
                                  onChange={(e) => handleUpdateLine(idx, 'font', e.target.value)}
                                >
                                  {GOOGLE_FONTS.map(font => (
                                    <option key={font.name} value={font.name}>{font.name} ({font.category})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="control-group">
                                <label className="control-label">Font Weight</label>
                                <select 
                                  className="select-input"
                                  value={line.weight}
                                  onChange={(e) => handleUpdateLine(idx, 'weight', e.target.value)}
                                >
                                  <option value="100">100 - Thin</option>
                                  <option value="200">200 - Ultra-Light</option>
                                  <option value="300">300 - Light</option>
                                  <option value="400">400 - Regular</option>
                                  <option value="500">500 - Medium</option>
                                  <option value="600">600 - Semi-Bold</option>
                                  <option value="700">700 - Bold</option>
                                  <option value="800">800 - Extra-Bold</option>
                                  <option value="900">900 - Heavy</option>
                                </select>
                              </div>
                            </div>

                            {/* Font Size & Tracking Sliders */}
                            <div className="control-group">
                              <label className="control-label">Font Size</label>
                              <div className="slider-container">
                                <input 
                                  type="range"
                                  className="range-slider"
                                  min="12"
                                  max="150"
                                  value={line.size}
                                  onChange={(e) => handleUpdateLine(idx, 'size', parseInt(e.target.value))}
                                />
                                <span className="slider-val">{line.size}px</span>
                              </div>
                            </div>

                            <div className="control-group">
                              <label className="control-label">Letter Spacing (Tracking)</label>
                              <div className="slider-container">
                                <input 
                                  type="range"
                                  className="range-slider"
                                  min="-5"
                                  max="30"
                                  value={line.tracking}
                                  onChange={(e) => handleUpdateLine(idx, 'tracking', parseInt(e.target.value))}
                                />
                                <span className="slider-val">{line.tracking}px</span>
                              </div>
                            </div>

                            {/* Casing & Styles toggles */}
                            <div className="control-grid-3">
                              <div className="control-group">
                                <label className="control-label">Text Case</label>
                                <select 
                                  className="select-input"
                                  value={line.transform || 'none'}
                                  onChange={(e) => handleUpdateLine(idx, 'transform', e.target.value)}
                                >
                                  <option value="none">Normal</option>
                                  <option value="uppercase">ALL CAPS</option>
                                  <option value="lowercase">lowercase</option>
                                </select>
                              </div>
                              <div className="control-group" style={{ justifyContent: 'center' }}>
                                <label className="toggle-row">
                                  <span className="control-label" style={{ margin: 0 }}>Italic</span>
                                  <input 
                                    type="checkbox"
                                    className="checkbox-toggle"
                                    checked={line.italic}
                                    onChange={(e) => handleUpdateLine(idx, 'italic', e.target.checked)}
                                  />
                                </label>
                              </div>
                              <div className="control-group" style={{ justifyContent: 'center' }}>
                                <label className="toggle-row">
                                  <span className="control-label" style={{ margin: 0 }}>Gradient</span>
                                  <input 
                                    type="checkbox"
                                    className="checkbox-toggle"
                                    checked={line.useGradient}
                                    onChange={(e) => handleUpdateLine(idx, 'useGradient', e.target.checked)}
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Solid Color Picker vs Gradient Picker */}
                            {!line.useGradient ? (
                              <div className="control-group">
                                <label className="control-label">Solid Color Fill</label>
                                <div className="color-picker-wrapper">
                                  <input 
                                    type="color" 
                                    className="color-dot-picker"
                                    value={line.color}
                                    onChange={(e) => handleUpdateLine(idx, 'color', e.target.value)}
                                  />
                                  <input 
                                    type="text" 
                                    className="text-input" 
                                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                                    value={line.color}
                                    onChange={(e) => handleUpdateLine(idx, 'color', e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="gradient-picker">
                                <label className="control-label" style={{ fontSize: '0.7rem' }}>Linear Color stops</label>
                                <div className="control-grid-2">
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                      type="color"
                                      className="color-dot-picker"
                                      style={{ width: '24px', height: '24px' }}
                                      value={line.gradientColors[0].color}
                                      onChange={(e) => {
                                        const newColors = [...line.gradientColors];
                                        newColors[0].color = e.target.value;
                                        handleUpdateLine(idx, 'gradientColors', newColors);
                                      }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stop 1</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                      type="color"
                                      className="color-dot-picker"
                                      style={{ width: '24px', height: '24px' }}
                                      value={line.gradientColors[1].color}
                                      onChange={(e) => {
                                        const newColors = [...line.gradientColors];
                                        newColors[1].color = e.target.value;
                                        handleUpdateLine(idx, 'gradientColors', newColors);
                                      }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stop 2</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Glow and Shadows toggles */}
                            <div className="section-card" style={{ padding: '14px', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="toggle-row">
                                <span className="control-label" style={{ margin: 0 }}>Neon Glowing Text</span>
                                <input 
                                  type="checkbox" 
                                  className="checkbox-toggle"
                                  checked={line.glow}
                                  onChange={(e) => handleUpdateLine(idx, 'glow', e.target.checked)}
                                />
                              </div>

                              {line.glow && (
                                <div className="control-grid-2" style={{ alignItems: 'center' }}>
                                  <div className="control-group">
                                    <label className="control-label" style={{ fontSize: '0.7rem' }}>Glow Intensity</label>
                                    <input 
                                      type="range"
                                      className="range-slider"
                                      min="5"
                                      max="40"
                                      value={line.glowSize}
                                      onChange={(e) => handleUpdateLine(idx, 'glowSize', parseInt(e.target.value))}
                                    />
                                  </div>
                                  <div className="control-group">
                                    <label className="control-label" style={{ fontSize: '0.7rem' }}>Glow Neon Color</label>
                                    <input 
                                      type="color"
                                      className="color-dot-picker"
                                      value={line.glowColor}
                                      onChange={(e) => handleUpdateLine(idx, 'glowColor', e.target.value)}
                                    />
                                  </div>
                                </div>
                              )}

                              {!line.glow && (
                                <>
                                  <div className="toggle-row">
                                    <span className="control-label" style={{ margin: 0 }}>Drop Shadows</span>
                                    <input 
                                      type="checkbox" 
                                      className="checkbox-toggle"
                                      checked={line.shadow}
                                      onChange={(e) => handleUpdateLine(idx, 'shadow', e.target.checked)}
                                    />
                                  </div>

                                  {line.shadow && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div className="control-grid-2">
                                        <div className="control-group">
                                          <label className="control-label" style={{ fontSize: '0.7rem' }}>Blur Size</label>
                                          <input 
                                            type="range"
                                            className="range-slider"
                                            min="0"
                                            max="20"
                                            value={line.shadowBlur}
                                            onChange={(e) => handleUpdateLine(idx, 'shadowBlur', parseInt(e.target.value))}
                                          />
                                        </div>
                                        <div className="control-group">
                                          <label className="control-label" style={{ fontSize: '0.7rem' }}>Shadow Color</label>
                                          <input 
                                            type="color"
                                            className="color-dot-picker"
                                            value={line.shadowColor}
                                            onChange={(e) => handleUpdateLine(idx, 'shadowColor', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="add-line-btn" onClick={handleAddLine}>
                  <Plus size={16} /> Append Title Line
                </button>
              </div>
            )}

            {/* TAB: ANIMATIONS MOTION */}
            {activeTab === 'animation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 className="section-title"><Sliders size={16} className="text-violet-400" /> Kinetic Animation Engine</h3>
                  
                  {/* Select Animation Preset */}
                  <div className="control-group" style={{ marginBottom: '16px' }}>
                    <label className="control-label">Motion Style Preset</label>
                    <select 
                      className="select-input"
                      value={animationStyle}
                      onChange={(e) => {
                        setAnimationStyle(e.target.value);
                        setIsPlaying(false);
                        setCurrentFrame(0);
                      }}
                    >
                      <option value="blur-slide">Blur Reveal & Slide Up</option>
                      <option value="cyber-glitch">Cyber Neon Flicker Glitch</option>
                      <option value="elastic-pop">Elastic Scale Pop-In</option>
                      <option value="typewriter">Typewriter Print (Character Slicing)</option>
                      <option value="cushion-bounce">Split Staggered Cushion Bounce</option>
                      <option value="scale-overshoot">Spring Scale Zoom Overshoot</option>
                      <option value="mask-reveal">Invisible Bounded Mask Slide</option>
                      <option value="skew-slide">Velocity Shear/Skew Slide</option>
                      <option value="tracking-expand">Cinematic Letter Spacing Expander</option>
                      <option value="light-sweep">Phosphor Linear Glow Sweep</option>
                    </select>
                  </div>

                  {/* Playback speed duration */}
                  <div className="control-group" style={{ marginBottom: '16px' }}>
                    <label className="control-label">Animation Loop Duration</label>
                    <div className="slider-container">
                      <input 
                        type="range"
                        className="range-slider"
                        min="2"
                        max="8"
                        step="0.5"
                        value={duration}
                        onChange={(e) => {
                          setDuration(parseFloat(e.target.value));
                          setIsPlaying(false);
                          setCurrentFrame(0);
                        }}
                      />
                      <span className="slider-val" style={{ width: '48px' }}>{duration}s</span>
                    </div>
                  </div>

                  {/* Framerate selection */}
                  <div className="control-group">
                    <label className="control-label">Framerate (FPS)</label>
                    <div className="segmented-control">
                      <button 
                        className={`segment-btn ${fps === 24 ? 'active' : ''}`}
                        onClick={() => { setFps(24); setIsPlaying(false); setCurrentFrame(0); }}
                      >
                        24 FPS
                      </button>
                      <button 
                        className={`segment-btn ${fps === 30 ? 'active' : ''}`}
                        onClick={() => { setFps(30); setIsPlaying(false); setCurrentFrame(0); }}
                      >
                        30 FPS
                      </button>
                      <button 
                        className={`segment-btn ${fps === 60 ? 'active' : ''}`}
                        onClick={() => { setFps(60); setIsPlaying(false); setCurrentFrame(0); }}
                      >
                        60 FPS
                      </button>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '24px 0' }} />

                  <h3 className="section-title"><Palette size={16} className="text-cyan-400" /> CRT Monitor Simulator</h3>
                  
                  {/* Scanline Selector */}
                  <div className="control-group" style={{ marginBottom: '16px' }}>
                    <label className="control-label">Raster Scanlines</label>
                    <select 
                      className="select-input"
                      value={crtScanlines}
                      onChange={(e) => setCrtScanlines(e.target.value)}
                    >
                      <option value="none">No Scanlines</option>
                      <option value="horizontal">Horizontal Raster Scanlines</option>
                      <option value="vertical">Vertical Raster Scanlines</option>
                      <option value="grid">CRT Triad Mesh Grid</option>
                    </select>
                  </div>

                  {crtScanlines !== 'none' && (
                    <>
                      {/* Scanline Opacity */}
                      <div className="control-group" style={{ marginBottom: '16px' }}>
                        <label className="control-label">Scanline Opacity (Intensity)</label>
                        <div className="slider-container">
                          <input 
                            type="range"
                            className="range-slider"
                            min="0.1"
                            max="0.8"
                            step="0.05"
                            value={crtScanlineOpacity}
                            onChange={(e) => setCrtScanlineOpacity(parseFloat(e.target.value))}
                          />
                          <span className="slider-val">{Math.round(crtScanlineOpacity * 100)}%</span>
                        </div>
                      </div>

                      {/* Scanline Spacing */}
                      <div className="control-group" style={{ marginBottom: '16px' }}>
                        <label className="control-label">Scanline Spacing (Pixel Size)</label>
                        <div className="slider-container">
                          <input 
                            type="range"
                            className="range-slider"
                            min="2"
                            max="6"
                            step="1"
                            value={crtScanlineSpacing}
                            onChange={(e) => setCrtScanlineSpacing(parseInt(e.target.value))}
                          />
                          <span className="slider-val">{crtScanlineSpacing}px</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Chromatic Aberration */}
                  <div className="control-group" style={{ marginBottom: '20px' }}>
                    <label className="control-label">Chromatic Aberration (Gun Alignment)</label>
                    <div className="slider-container">
                      <input 
                        type="range"
                        className="range-slider"
                        min="0"
                        max="8"
                        step="1"
                        value={crtChromaticAberration}
                        onChange={(e) => setCrtChromaticAberration(parseInt(e.target.value))}
                      />
                      <span className="slider-val">{crtChromaticAberration}px</span>
                    </div>
                  </div>

                  {/* Checkbox Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="toggle-row">
                      <span className="control-label" style={{ margin: 0 }}>Phosphor Screen Flicker</span>
                      <input 
                        type="checkbox"
                        className="checkbox-toggle"
                        checked={crtFlicker}
                        onChange={(e) => setCrtFlicker(e.target.checked)}
                      />
                    </div>
                    <div className="toggle-row">
                      <span className="control-label" style={{ margin: 0 }}>Retro Curved Vignette</span>
                      <input 
                        type="checkbox"
                        className="checkbox-toggle"
                        checked={crtVignette}
                        onChange={(e) => setCrtVignette(e.target.checked)}
                      />
                    </div>
                    <div className="toggle-row">
                      <span className="control-label" style={{ margin: 0 }}>Analog Grain Noise</span>
                      <input 
                        type="checkbox"
                        className="checkbox-toggle"
                        checked={crtNoise}
                        onChange={(e) => setCrtNoise(e.target.checked)}
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: EXPORTS */}
            {activeTab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 className="section-title"><Download size={16} className="text-violet-400" /> Export Title Presets</h3>
                  
                  {/* Target Resolution */}
                  <div className="control-group" style={{ marginBottom: '20px' }}>
                    <label className="control-label">Target Rendering Canvas Size</label>
                    <select 
                      className="select-input"
                      value={RESOLUTION_PRESETS.findIndex(r => r.width === resolution.width && r.height === resolution.height)}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        setResolution({
                          width: RESOLUTION_PRESETS[idx].width,
                          height: RESOLUTION_PRESETS[idx].height,
                          name: RESOLUTION_PRESETS[idx].name
                        });
                      }}
                    >
                      {RESOLUTION_PRESETS.map((res, rIdx) => (
                        <option key={rIdx} value={rIdx}>{res.name} ({res.width}x{res.height})</option>
                      ))}
                    </select>
                  </div>

                  <div className="export-options-list">
                    {/* PNG SEQUENCE ZIP */}
                    <div className="export-card">
                      <div className="export-info">
                        <span className="export-format-name">PNG Image Sequence (ZIP)</span>
                        <span className="export-format-desc">Pro standard. Full 8-bit alpha lossless frames. Drag & Drop into FCP timeline.</span>
                      </div>
                      <button 
                        className="export-action-btn"
                        onClick={() => handleTriggerExport('png-zip')}
                        disabled={fontsLoading}
                      >
                        <Image size={14} /> ZIP
                      </button>
                    </div>

                    {/* CHROMA KEY GREEN SCREEN */}
                    <div className="export-card">
                      <div className="export-info">
                        <span className="export-format-name">Green Screen (Chroma Key VP9)</span>
                        <span className="export-format-desc">100% native FCP timeline clip. Drop it in and apply the FCP "Keyer" filter.</span>
                      </div>
                      <button 
                        className="export-action-btn"
                        onClick={() => handleTriggerExport('chroma-green')}
                        disabled={fontsLoading}
                      >
                        <Video size={14} /> MOV
                      </button>
                    </div>

                    {/* TRANSPARENT WEBM */}
                    <div className="export-card">
                      <div className="export-info">
                        <span className="export-format-name">Transparent WebM Video</span>
                        <span className="export-format-desc">Alpha transparent video file. Native in CapCut, Premiere, DaVinci, OBS.</span>
                      </div>
                      <button 
                        className="export-action-btn"
                        onClick={() => handleTriggerExport('transparent-webm')}
                        disabled={fontsLoading}
                      >
                        <Video size={14} /> WEBM
                      </button>
                    </div>

                    {/* TRANSPARENT GIF */}
                    <div className="export-card">
                      <div className="export-info">
                        <span className="export-format-name">Transparent Animated GIF</span>
                        <span className="export-format-desc">Lightweight looped graphic. Automatically scales to 960px width to keep sizes optimized.</span>
                      </div>
                      <button 
                        className="export-action-btn"
                        onClick={() => handleTriggerExport('transparent-gif')}
                        disabled={fontsLoading}
                      >
                        <Image size={14} /> GIF
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* Right Side: Preview & Timeline Control */}
        <main className="workspace">
          
          {/* Virtual Canvas Viewport Container */}
          <div className="preview-container">
            <div className={`canvas-wrapper ${bgType === 'transparent' ? 'transparent-bg' : bgType === 'green' ? 'green-bg' : 'blue-bg'}`}>
              
              {fontsLoading && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', color: '#fff', background: 'rgba(0,0,0,0.85)', padding: '20px 40px', borderRadius: '12px', border: '1px solid var(--border-color)', zIndex: 5 }}>
                  <Loader2 className="animate-spin text-cyan-400" size={24} style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Syncing Google Fonts API...</span>
                </div>
              )}

              <canvas 
                ref={canvasRef}
                className="preview-canvas"
                width={resolution.width}
                height={resolution.height}
              />
            </div>
          </div>

          {/* Bottom Transport Timeline Scrub bar */}
          <div className="transport-bar">
            <div className="timeline-scrubber-group">
              <input 
                type="range"
                className="timeline-scrubber"
                min="0"
                max={totalFrames - 1}
                value={currentFrame}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentFrame(parseInt(e.target.value));
                }}
              />
              <span className="timeline-time-display">
                Frame {currentFrame + 1} / {totalFrames}
              </span>
            </div>

            <div className="transport-controls">
              {/* Playback action items */}
              <div className="playback-buttons">
                <button 
                  className="icon-btn"
                  onClick={() => setCurrentFrame(0)}
                  title="Rewind to Frame 1"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  className={`icon-btn primary`}
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Pause' : 'Play Preview'}
                >
                  {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />}
                </button>
              </div>

              {/* Status details */}
              <div className="timeline-stats">
                <div className="stat-item">
                  Canvas: <span>{resolution.width} x {resolution.height}</span>
                </div>
                <div className="stat-item">
                  FPS: <span>{fps} frames</span>
                </div>
                <div className="stat-item">
                  Duration: <span>{duration}s</span>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Render Compilation Progress HUD Overlay Modal */}
      {exporting && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="export-spinner" />
            <span className="export-modal-title">Generating Motion Overlay</span>
            <span className="export-modal-subtitle">Writing deterministic high-end assets. Please do not close this window.</span>
            
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${exportProgress}%` }} />
            </div>
            
            <span className="progress-text">{exportProgress}% Completed</span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
