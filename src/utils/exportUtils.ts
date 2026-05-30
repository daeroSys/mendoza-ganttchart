/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function generateExportImage(element: HTMLElement, format: 'png' | 'jpeg' = 'png', title?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Get full printable size
      let width = element.scrollWidth || 1200;
      let height = element.scrollHeight || 800;
      let sideTableWidth = 384;
      let timelineScrollWidth = width;

      // The Gantt container has an inner scrollable axis that hides the full width from the parent element's scrollWidth
      const timelineAxis = element.querySelector('#timeline-scroll-axis') as HTMLElement | null;
      const sideTable = element.querySelector('#side-task-table') as HTMLElement | null;
      if (timelineAxis && sideTable) {
        sideTableWidth = sideTable.offsetWidth || 384;
        timelineScrollWidth = timelineAxis.scrollWidth;

        // Always compute for row layout (side-by-side) since export forces flex-direction: row
        width = sideTableWidth + timelineScrollWidth;
        height = Math.max(sideTable.scrollHeight, timelineAxis.scrollHeight);
      }

      // 2. Read styles from style tags, removing imports and external fonts to prevent sandbox blocks
      let cssStyles = '';
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach(style => {
        let content = style.textContent || '';
        // Strip any @import rules (both url() and string versions)
        content = content.replace(/@import\s+(url\([^)]+\)|"[^"]+"|'[^']+'|[^;]+);?/g, '');
        // Strip any @font-face rules completely (handles multi-line and nested blocks)
        content = content.replace(/@font-face\s*\{[\s\S]*?\}/g, '');
        // Strip any url(...) references that don't start with a local fragment identifier (#) to prevent sandboxing errors
        content = content.replace(/url\(\s*(['"]?)([^#].*?)\1\s*\)/g, 'none');
        cssStyles += content + '\n';
      });

      // 3. Serialize HTML node to valid XHTML
      const serializer = new XMLSerializer();
      const elementXhtml = serializer.serializeToString(element);

      // 4. Construct self-contained SVG package
      const titleHeight = title ? 90 : 40;
      const fullHeight = height + titleHeight;

      const titleHtml = title ? `
        <div style="height: ${titleHeight}px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.025em; color: inherit; border-bottom: 1px solid rgba(148, 163, 184, 0.2); gap: 4px;">
          <div style="font-size: 28px; font-weight: 800;">${title}</div>
          <div style="font-family: sans-serif; font-size: 13px; font-weight: 600; opacity: 0.7;">Made By: Cedric Paul Mendoza</div>
        </div>
      ` : `
        <div style="height: ${titleHeight}px; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 13px; font-weight: 600; color: inherit; opacity: 0.7; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          Made By: Cedric Paul Mendoza
        </div>
      `;

      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fullHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <style>
                <![CDATA[
                ${cssStyles}
                /* Hide scrollbars during export */
                ::-webkit-scrollbar { display: none !important; }
                /* Hide edit/delete actions during export */
                [id^="row-actions-"], [id^="btn-edit-"], [id^="btn-delete-"] {
                  display: none !important;
                }
                /* Hide Today indicator line during export */
                #today-indicator-line {
                  display: none !important;
                }
                /* Force proper theme background colors */
                .dark {
                  background-color: #020617 !important;
                  color: #f1f5f9 !important;
                }
                body, html {
                  background: transparent !important;
                }
                /* Override scroll restrictions so the full timeline renders */
                /* Force row layout — lg: breakpoint does not apply inside SVG foreignObject */
                #gantt-planner-container {
                  overflow: visible !important;
                  width: ${width}px !important;
                  height: ${height}px !important;
                  display: flex !important;
                  flex-direction: row !important;
                  border-radius: 0 !important;
                }
                #side-task-table {
                  width: ${sideTableWidth}px !important;
                  min-width: ${sideTableWidth}px !important;
                  flex-shrink: 0 !important;
                  overflow: visible !important;
                  border-right: 1px solid rgba(148, 163, 184, 0.2) !important;
                  border-bottom: none !important;
                }
                #timeline-scroll-axis {
                  overflow: visible !important;
                  flex: 1 !important;
                  width: ${timelineScrollWidth}px !important;
                }
                ]]>
              </style>
              <div class="${document.documentElement.className}" style="width: ${width}px; height: ${fullHeight}px; display: flex; flex-direction: column; background: transparent; color: inherit;">
                ${titleHtml}
                <div style="width: ${width}px; height: ${height}px; position: relative;">
                  ${elementXhtml}
                </div>
              </div>
            </div>
          </foreignObject>
        </svg>
      `;

      // Validate SVG string using DOMParser to catch XML parsing errors early
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('XML Parsing Error in generated SVG:', parserError.textContent);
      }

      // Use a Data URI instead of Blob URL to bypass cross-origin canvas taint checks in some browsers
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = fullHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fill base canvas color
            const isDark = document.documentElement.classList.contains('dark');
            ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
            ctx.fillRect(0, 0, width, fullHeight);

            ctx.drawImage(img, 0, 0);

            const imgUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.95 : undefined);
            resolve(imgUrl);
          } else {
            reject(new Error('Failed to get 2D context'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

export async function exportElementAsImage(element: HTMLElement, fileName: string, format: 'png' | 'jpeg' = 'png', title?: string) {
  try {
    const imgUrl = await generateExportImage(element, format, title);
    const anchor = document.createElement('a');
    anchor.href = imgUrl;
    anchor.download = `${fileName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } catch (error) {
    console.error('Failed to export image:', error);
    alert('Failed to export Gantt chart as image due to layout rendering error.');
  }
}
