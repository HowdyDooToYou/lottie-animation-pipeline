export interface AsciiAnimation {
  frames: AsciiFrame[];
  fps: number;
  loop?: boolean;
  name?: string;
}

export interface AsciiFrame {
  width: number;
  height: number;
  content: string;
}

export function renderAsciiAnimation(anim: AsciiAnimation): string {
  const lines: string[] = [];

  if (anim.frames.length === 0) {
    return '```\n[empty animation]\n```';
  }

  if (anim.name) {
    lines.push(`### ${anim.name}`);
  }

  lines.push('```');

  for (const frame of anim.frames) {
    lines.push(frame.content);
    lines.push('---');
  }

  lines.push('```');
  lines.push(`* ${anim.fps} fps, ${anim.frames.length} frames${anim.loop ? ', looping' : ''}`);

  return lines.join('\n');
}

export function createAsciiFrame(width: number, height: number, pixels: string[][]): AsciiFrame {
  const content = pixels.map(row => row.join('')).join('\n');
  return { width, height, content };
}

export function clearFrame(width: number, height: number): AsciiFrame {
  const content = Array(height).fill('.'.repeat(width)).join('\n');
  return { width, height, content };
}

export function setPixel(frame: AsciiFrame, x: number, y: number, char: string): AsciiFrame {
  const rows = frame.content.split('\n');
  if (y >= 0 && y < rows.length && x >= 0 && x < rows[y].length) {
    rows[y] = rows[y].substring(0, x) + char + rows[y].substring(x + 1);
  }
  return { ...frame, content: rows.join('\n') };
}