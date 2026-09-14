/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-ignore
import domtoimage from 'dom-to-image-more';

export async function generateExportImage(element: HTMLElement, format: 'png' | 'jpeg' = 'png', title?: string): Promise<string> {
  const isDark = document.documentElement.classList.contains('dark');
  const bgColor = isDark ? '#020617' : '#f8fafc';

  // Calculate full dimensions
  const sideTable = element.querySelector('#side-task-table') as HTMLElement;
  const timelineAxis = element.querySelector('#timeline-scroll-axis') as HTMLElement;
  
  let fullWidth = element.scrollWidth || 1200;
  let fullHeight = element.scrollHeight || 800;
  
  if (sideTable && timelineAxis) {
    const sideTableWidth = sideTable.offsetWidth || 384;
    const timelineScrollWidth = timelineAxis.scrollWidth;
    fullWidth = sideTableWidth + timelineScrollWidth;
    fullHeight = Math.max(sideTable.scrollHeight, timelineAxis.scrollHeight);
  }

  // Backup original styles to restore later
  const origWidth = element.style.width;
  const origHeight = element.style.height;
  const origOverflow = element.style.overflow;
  const origDisplay = element.style.display;
  const origFlexDir = element.style.flexDirection;
  
  // Hide UI controls
  const elementsToHide = document.querySelectorAll(
    '[id^="row-actions-"], [id^="btn-edit-"], [id^="btn-delete-"], #today-indicator-line'
  );
  elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

  let dataUrl = '';
  
  try {
    // Force layout for accurate capture
    element.style.width = `${fullWidth}px`;
    element.style.height = `${fullHeight}px`;
    element.style.overflow = 'visible';
    element.style.display = 'flex';
    element.style.flexDirection = 'row';
    
    if (sideTable) {
      sideTable.style.width = `${sideTable.offsetWidth || 384}px`;
      sideTable.style.minWidth = `${sideTable.offsetWidth || 384}px`;
      sideTable.style.flexShrink = '0';
      sideTable.style.borderBottom = 'none';
      sideTable.style.overflow = 'visible';
    }
    
    if (timelineAxis) {
      timelineAxis.style.width = `${timelineAxis.scrollWidth}px`;
      timelineAxis.style.flex = '1';
      timelineAxis.style.overflow = 'visible';
    }

    const options = {
      width: fullWidth,
      height: fullHeight,
      bgcolor: bgColor,
      style: {
        transform: 'none',
        transformOrigin: 'top left'
      },
      // A common fix for missing styles in Vite/Tailwind when using dom-to-image
      copyDefaultStyles: false
    };

    // Give the DOM a tiny frame to apply the style modifications before capture
    await new Promise(resolve => setTimeout(resolve, 50));

    if (format === 'jpeg') {
      dataUrl = await domtoimage.toJpeg(element, { ...options, quality: 0.95 });
    } else {
      dataUrl = await domtoimage.toPng(element, options);
    }

  } finally {
    // Restore layout
    element.style.width = origWidth;
    element.style.height = origHeight;
    element.style.overflow = origOverflow;
    element.style.display = origDisplay;
    element.style.flexDirection = origFlexDir;
    
    if (sideTable) {
      sideTable.style.width = '';
      sideTable.style.minWidth = '';
      sideTable.style.flexShrink = '';
      sideTable.style.borderBottom = '';
      sideTable.style.overflow = '';
    }
    if (timelineAxis) {
      timelineAxis.style.width = '';
      timelineAxis.style.flex = '';
      timelineAxis.style.overflow = '';
    }

    elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
  }

  return dataUrl;
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
