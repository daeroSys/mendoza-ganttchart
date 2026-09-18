import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'dark',
  themeVariables: {
    // Background
    background: 'transparent',
    // Primary nodes
    primaryColor: '#1e293b',
    primaryBorderColor: '#475569',
    primaryTextColor: '#e2e8f0',
    // Secondary / tertiary nodes
    secondaryColor: '#0f172a',
    secondaryBorderColor: '#334155',
    secondaryTextColor: '#cbd5e1',
    tertiaryColor: '#162032',
    tertiaryBorderColor: '#334155',
    tertiaryTextColor: '#cbd5e1',
    // Edges / lines — the main fix
    lineColor: '#94a3b8',
    edgeLabelBackground: '#0f172a',
    // Text & labels
    fontSize: '13px',
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
    labelTextColor: '#e2e8f0',
    // Special nodes
    nodeBorder: '#475569',
    clusterBkg: '#1e293b',
    clusterBorder: '#334155',
    // Decision diamond / special shapes
    fillType0: '#1e3a5f',
    fillType1: '#1b3a4b',
    fillType2: '#1e293b',
    fillType3: '#1e293b',
    fillType4: '#162032',
    fillType5: '#0f172a',
    fillType6: '#1e293b',
    fillType7: '#1e293b',
    // Sequence diagrams
    actorBorder: '#475569',
    actorBkg: '#1e293b',
    actorTextColor: '#e2e8f0',
    actorLineColor: '#94a3b8',
    signalColor: '#94a3b8',
    signalTextColor: '#e2e8f0',
    activationBorderColor: '#60a5fa',
    activationBkgColor: '#1e3a5f',
    labelBoxBkgColor: '#1e293b',
    labelBoxBorderColor: '#475569',
    loopTextColor: '#e2e8f0',
    // Pie chart
    pie1: '#2563eb',
    pie2: '#7c3aed',
    pie3: '#059669',
    pie4: '#d97706',
    pie5: '#dc2626',
    pie6: '#0891b2',
    pie7: '#c026d3',
    pie8: '#65a30d',
    pieTextColor: '#e2e8f0',
    pieSectionTextColor: '#e2e8f0',
  }
});

interface MermaidDiagramProps {
  chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setError(null);
        if (chart && chart.trim() !== '') {
          const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const { svg } = await mermaid.render(id, chart);
          if (isMounted) {
            // Strip any hardcoded background fill from the SVG root so our
            // container background shows through cleanly.
            let cleaned = svg
              .replace(/background:\s*[^;"]+;?\s*/gi, '')
              .replace(/<rect[^>]*class="[^"]*background[^"]*"[^>]*>/gi, (match) =>
                match.replace(/fill="[^"]*"/, 'fill="transparent"')
              );

            // Robust check for light node backgrounds and force dark text on them
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(cleaned, "image/svg+xml");
              
              const getLuminance = (r: number, g: number, b: number) => {
                const [rs, gs, bs] = [r, g, b].map(c => {
                  c = c / 255;
                  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                });
                return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
              };

              const isLightColor = (colorStr: string | null) => {
                if (!colorStr) return false;
                const str = colorStr.trim().toLowerCase();
                if (str === 'none' || str === 'transparent') return false;
                if (str === 'white') return true;
                if (str === 'black') return false;
                
                if (str.startsWith('#')) {
                  let hex = str.slice(1);
                  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                  if (hex.length === 6) {
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    return getLuminance(r, g, b) > 0.5;
                  }
                  return false;
                }
                
                const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                if (rgbMatch) {
                  return getLuminance(parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)) > 0.5;
                }
                
                return false;
              };

              const styleBlocks = doc.querySelectorAll('style');
              const lightClasses = new Set<string>();
              styleBlocks.forEach(styleBlock => {
                const cssText = styleBlock.textContent || '';
                const regex = /\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*fill:\s*([^;!}]+)[^}]*\}/gi;
                let match;
                while ((match = regex.exec(cssText)) !== null) {
                  if (isLightColor(match[2])) {
                    lightClasses.add(match[1]);
                  }
                }
              });

              const shapes = doc.querySelectorAll('rect, circle, ellipse, polygon, path, use');
              shapes.forEach(shape => {
                let hasLightBg = false;
                if (isLightColor(shape.getAttribute('fill'))) hasLightBg = true;
                
                const styleAttr = shape.getAttribute('style') || '';
                const styleFillMatch = styleAttr.match(/fill:\s*([^;!]+)/i);
                if (styleFillMatch && isLightColor(styleFillMatch[1])) hasLightBg = true;
                
                shape.classList.forEach(cls => {
                  if (lightClasses.has(cls)) hasLightBg = true;
                });
                
                if (hasLightBg) {
                  let container = shape.closest('.node, .cluster, .edgeLabel, .actor');
                  if (!container) container = shape.parentElement;
                  
                  if (container) {
                    const texts = container.querySelectorAll('text, span, div, p, foreignObject');
                    texts.forEach(t => {
                      const currentStyle = t.getAttribute('style') || '';
                      t.setAttribute('style', currentStyle + ' color: #0f172a !important; fill: #0f172a !important;');
                      
                      const innerElements = t.querySelectorAll('*');
                      innerElements.forEach(inner => {
                        const innerStyle = inner.getAttribute('style') || '';
                        inner.setAttribute('style', innerStyle + ' color: #0f172a !important; fill: #0f172a !important;');
                      });
                    });
                  }
                }
              });
              
              cleaned = new XMLSerializer().serializeToString(doc);
            } catch (e) {
              console.warn("Failed to parse SVG for text color correction", e);
            }

            setSvgContent(cleaned);
          }
        } else {
          if (isMounted) setSvgContent('');
        }
      } catch (err: any) {
        console.error('Mermaid parsing error:', err);
        if (isMounted) setError(err.message || 'Syntax error in Mermaid diagram');
      }
    };
    renderDiagram();
    return () => { isMounted = false; };
  }, [chart]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 text-rose-400 bg-rose-950/20 rounded-xl overflow-auto">
        <pre className="text-xs whitespace-pre-wrap font-mono">{error}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 text-slate-500">
        Empty diagram
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[680px] relative group bg-transparent rounded-xl flex flex-col">
      <TransformWrapper
        initialScale={1}
        minScale={0.05}
        maxScale={10}
        centerOnInit
        centerZoomedOut
        limitToBounds={false}
        wheel={{ step: 0.01, smoothStep: 0.001 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 border border-slate-700 backdrop-blur-sm p-1.5 rounded-xl shadow-lg">
              <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => resetTransform()} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', minHeight: '680px', overflow: 'visible' }}
              contentStyle={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div
                className="mermaid-output cursor-grab active:cursor-grabbing [&>svg]:max-w-none [&_path]:stroke-slate-400 [&_.edgePath_.path]:stroke-slate-400 [&_.flowchart-link]:stroke-slate-400 [&_marker_path]:fill-slate-400"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
