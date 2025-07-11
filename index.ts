import { clamp, dot } from '@basementuniverse/utils';
import { mat, vec2 } from '@basementuniverse/vec';

export type Color = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

type LineStyle = 'solid' | 'dashed' | 'dotted';

export type StyleOptions = {
  /**
   * If set to true, don't begin a new path before drawing
   *
   * This allows for batch-drawing multiple shapes with a single path
   */
  batch?: boolean;

  /**
   * Whether to fill shapes with color
   */
  fill: boolean;

  /**
   * The color to use for filling shapes
   *
   * If null, don't set the fillStyle (we assume it has been set elsewhere)
   */
  fillColor: Color | string | null;

  /**
   * The gradient to use for filling shapes, if any
   */
  gradient: {
    /**
     * The type of gradient to create
     * - 'linear' for a linear gradient
     * - 'radial' for a radial gradient
     */
    type: 'linear' | 'radial';

    /**
     * The starting point of the gradient, as a vector { x, y }
     * For radial gradients, this is the center point
     */
    start: vec2;

    /**
     * The ending point of the gradient, as a vector { x, y }
     */
    end: vec2;

    /**
     * An array of color stops defining the gradient
     */
    colorStops: {
      /**
       * The color at this stop
       */
      color: Color | string;

      /**
       * The position of the color stop, from 0 to 1
       */
      position: number;
    }[];
  } | null;

  /**
   * Whether to stroke shapes with lines
   */
  stroke: boolean;

  /**
   * The color to use for drawing lines
   *
   * If null, don't set the strokeStyle (we assume it has been set elsewhere)
   */
  strokeColor: Color | string | null;

  /**
   * The width of the lines
   *
   * If null, don't set the lineWidth (we assume it has been set elsewhere)
   */
  lineWidth: number | null;

  /**
   * The style of the line (e.g., solid, dashed)
   */
  lineStyle: LineStyle;

  /**
   * The dash pattern for dashed lines, if applicable
   * An array of numbers specifying the lengths of dashes and gaps
   *
   * If null, don't set the lineDash (we assume it has been set elsewhere)
   */
  lineDash: number[] | null;

  /**
   * The type of cross to draw
   */
  crossStyle?: '+' | 'x';

  /**
   * If true, round the corners of rectangles and triangles
   */
  rounded?: boolean;

  /**
   * The radius to use for rounding corners in rectangles
   *
   * This is only used if `rounded` is true
   */
  borderRadius?: number;

  /**
   * Options for drawing arrowheads at the end of arrows
   */
  arrow?: {
    /**
     * The type of arrowhead to draw at the end of the line
     *
     * This can be a predefined type, or a function for drawing custom arrowheads
     */
    type?:
      | 'caret' // Triangle pointing in the direction of the line
      | 'chevron' // V-shaped arrowhead
      | ((context: CanvasRenderingContext2D, ...args: any[]) => void);

    /**
     * The size of the arrowhead in pixels
     */
    size?: number;
  } | null;

  /**
   * When stroking a path, the type of interpolation to use for curves
   */
  pathType?: 'linear' | 'bezier' | 'catmull-rom';

  /**
   * If using bezier curves, the order of the bezier path
   *
   * This determines how many control points are used for the bezier curve
   *
   * For example:
   * - 1: Linear (no control points, same as 'linear' pathType)
   * - 2: Quadratic bezier (1 control point)
   * - 3: Cubic bezier (2 control points)
   * - etc.
   */
  bezierOrder?: number;

  /**
   * If using catmull-rom curves, the tension parameter for the curve
   * - 0.0: Uniform spline (smoothest)
   * - 0.5: Centripetal spline (good for avoiding loops)
   * - 1.0: Chordal spline (more angular)
   */
  catmullRomTension?: number;

  /**
   * Additional custom properties for future extensions
   */
  [key: string]: any;
};

const DEFAULT_STYLE_OPTIONS: StyleOptions = {
  batch: false,
  fill: false,
  fillColor: null,
  gradient: null,
  stroke: true,
  strokeColor: null,
  lineWidth: 1,
  lineStyle: 'solid',
  lineDash: null,
  crossStyle: 'x',
  rounded: false,
  arrow: {
    type: 'caret',
    size: 5,
  },
};

const DEFAULT_LINE_DASHES: Record<LineStyle, number[]> = {
  solid: [],
  dashed: [5, 5],
  dotted: [1, 3],
};

const BEZIER_MATRICES: Record<number, mat> = {
  1: mat(2, 2, [-1, 1, 1, 0]),
  2: mat(3, 3, [1, -2, 1, -2, 2, 0, 1, 0, 0]),
  3: mat(4, 4, [-1, 3, -3, 1, 3, -6, 3, 0, -3, 3, 0, 0, 1, 0, 0, 0]),
};

const BEZIER_COEFFICIENTS: (t: number, order: 1 | 2 | 3) => number[] = (
  t,
  order
) =>
  ({
    1: [t, 1],
    2: [t * t, t, 1],
    3: [t * t * t, t * t, t, 1],
  }[order]);

const CATMULL_ROM_BASIS_FUNCTIONS: ((t: number, tension: number) => number)[] =
  [
    (t, tension) =>
      -tension * Math.pow(t, 3) + 2 * tension * Math.pow(t, 2) - tension * t,
    (t, tension) =>
      (2 - tension) * Math.pow(t, 3) + (tension - 3) * Math.pow(t, 2) + 1,
    (t, tension) =>
      (tension - 2) * Math.pow(t, 3) +
      (3 - 2 * tension) * Math.pow(t, 2) +
      tension * t,
    (t, tension) => tension * Math.pow(t, 3) - tension * Math.pow(t, 2),
  ];

const CATMULL_ROM_BASIS_VECTOR: (t: number, tension: number) => number[] = (
  t,
  tension
) => CATMULL_ROM_BASIS_FUNCTIONS.map(f => f(t, tension));

/**
 * Type guard to check if a value is a Color object
 */
function isColorObject(color: Color | string): color is Color {
  return (
    typeof color === 'object' &&
    'r' in color &&
    'g' in color &&
    'b' in color &&
    (typeof color.a === 'number' || !('a' in color))
  );
}

/**
 * Convert a color object to a string in the format "rgba(r, g, b, a)"
 */
function colourToString(color: Color): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
}

/**
 * Prepare a color value (string or Color object) for use in styles
 */
function prepareColor(color: Color | string): string {
  if (typeof color === 'string') {
    // Assume it's already a valid CSS color string
    return color;
  } else if (isColorObject(color)) {
    // Convert Color object to CSS color string
    return colourToString(color);
  }

  // If it's neither, default to black
  return 'black';
}

/**
 * Prepare a gradient for use in styles
 *
 * Returns a CanvasGradient object or null if no gradient is specified
 */
function prepareGradient(
  context: CanvasRenderingContext2D,
  style: StyleOptions['gradient']
): CanvasGradient | null {
  if (!style) {
    return null;
  }

  let gradient: CanvasGradient;
  if (style.type === 'linear') {
    gradient = context.createLinearGradient(
      style.start.x,
      style.start.y,
      style.end.x,
      style.end.y
    );
  } else {
    gradient = context.createRadialGradient(
      style.start.x,
      style.start.y,
      0,
      style.start.x,
      style.start.y,
      vec2.len(vec2.sub(style.end, style.start)) / 2
    );
  }

  for (const stop of style.colorStops) {
    gradient.addColorStop(stop.position, prepareColor(stop.color));
  }
  return gradient;
}

/**
 * Get a complete style object with default values filled in
 */
function getStyle(style?: Partial<StyleOptions>): StyleOptions {
  return Object.assign({}, DEFAULT_STYLE_OPTIONS, {
    ...(style ?? {}),
    lineDash:
      style && style.lineDash !== undefined
        ? style.lineDash
        : style?.lineStyle === undefined
        ? []
        : DEFAULT_LINE_DASHES[style.lineStyle ?? 'solid'],
  });
}

/**
 * Pass in a context and some number of functions that take a context as their
 * first argument, and return an array of functions that don't require the
 * context argument
 *
 * If only one function is passed, this will return a single function
 */
export function withContext(
  context: CanvasRenderingContext2D,
  ...functions: ((context: CanvasRenderingContext2D, ...args: any[]) => void)[]
): ((...args: any[]) => void) | ((...args: any[]) => void)[] {
  const result = functions.map(f => {
    return (...args: any[]) => {
      f(context, ...args);
    };
  });
  return result.length === 1 ? result[0] : result;
}

/**
 * Draw a straight line segment between two points
 */
export function line(
  context: CanvasRenderingContext2D,
  start: vec2,
  end: vec2,
  style?: Partial<StyleOptions>
): void {
  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path so we can add to any
  // existing path and draw multiple lines in one go
  if (!actualStyle.batch) {
    context.beginPath();
  }

  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);

  // Stroke the path if required
  // Additionally, if this is a batch operation, we don't stroke right away so
  // that we can add more lines to the same path if we want
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}

/**
 * Draw a cross at a given position with a specified size
 */
export function cross(
  context: CanvasRenderingContext2D,
  position: vec2,
  size: number,
  style?: Partial<StyleOptions>
): void {
  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path so we can add to any
  // existing path and draw multiple lines in one go
  if (!actualStyle.batch) {
    context.beginPath();
  }

  // Draw the cross
  const halfSize = size / 2;
  if (actualStyle.crossStyle === '+') {
    // Plus sign cross
    context.moveTo(position.x - halfSize, position.y);
    context.lineTo(position.x + halfSize, position.y);
    context.moveTo(position.x, position.y - halfSize);
    context.lineTo(position.x, position.y + halfSize);
  } else if (actualStyle.crossStyle === 'x') {
    // X cross
    context.moveTo(position.x - halfSize, position.y - halfSize);
    context.lineTo(position.x + halfSize, position.y + halfSize);
    context.moveTo(position.x - halfSize, position.y + halfSize);
    context.lineTo(position.x + halfSize, position.y - halfSize);
  }

  // Stroke the path if required
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}

/**
 * Draw an arrow from a start point to an end point with an optional arrowhead
 * at the end
 *
 * This function does not support batch drawing since it requires
 * beginning a new path for the arrowhead
 */
export function arrow(
  context: CanvasRenderingContext2D,
  start: vec2,
  end: vec2,
  style?: Partial<StyleOptions>
): void {
  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // Arrows don't support batch drawing since we have to begin a new path
  // when drawing the arrowhead
  context.beginPath();

  // Draw the line segment
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  // Draw the arrowhead if specified
  if (actualStyle.arrow) {
    const arrowSize = actualStyle.arrow.size ?? 10;
    const halfSize = arrowSize / 2;
    const angle = vec2.rad(vec2.sub(end, start));
    const arrowType = actualStyle.arrow.type ?? 'caret';

    context.save();
    context.translate(end.x, end.y);
    context.rotate(angle);

    if (typeof arrowType === 'function') {
      arrowType(context, arrowSize);
    } else if (arrowType === 'caret') {
      if (actualStyle.strokeColor !== null) {
        context.fillStyle = prepareColor(actualStyle.strokeColor);
      }
      context.beginPath();
      context.moveTo(0, -halfSize);
      context.lineTo(arrowSize, 0);
      context.lineTo(0, halfSize);
      context.closePath();
      context.fill();
    } else if (arrowType === 'chevron') {
      context.beginPath();
      context.moveTo(-halfSize, -halfSize);
      context.lineTo(0, 0);
      context.lineTo(-halfSize, halfSize);
      context.stroke();
    }
    context.restore();
  }

  context.restore();
}

/**
 * Draw a circle at a specified center point with a given radius
 */
export function circle(
  context: CanvasRenderingContext2D,
  center: vec2,
  radius: number,
  style?: Partial<StyleOptions>
): void {
  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.fillColor !== null) {
    context.fillStyle = prepareColor(actualStyle.fillColor);
  }
  if (actualStyle.gradient) {
    const gradient = prepareGradient(context, actualStyle.gradient);
    if (gradient) {
      context.fillStyle = gradient;
    }
  }
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path so we can add to any
  // existing path and draw multiple shapes in one go
  if (!actualStyle.batch) {
    context.beginPath();
  }

  // Draw the circle
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);

  // Fill the circle if required
  if (actualStyle.fill && !actualStyle.batch) {
    context.fill();
  }

  // Stroke the circle if required
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}

/**
 * Draw a rectangle at a specified position with a given size
 */
export function rectangle(
  context: CanvasRenderingContext2D,
  position: vec2,
  size: vec2,
  style?: Partial<StyleOptions>
): void {
  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.fillColor !== null) {
    context.fillStyle = prepareColor(actualStyle.fillColor);
  }
  if (actualStyle.gradient) {
    const gradient = prepareGradient(context, actualStyle.gradient);
    if (gradient) {
      context.fillStyle = gradient;
    }
  }
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path so we can add to any
  // existing path and draw multiple shapes in one go
  if (!actualStyle.batch) {
    context.beginPath();
  }

  // Draw the rectangle
  if (actualStyle.rounded) {
    context.roundRect(
      position.x,
      position.y,
      size.x,
      size.y,
      actualStyle.borderRadius ?? 1
    );
  } else {
    context.rect(position.x, position.y, size.x, size.y);
  }

  // Fill the rectangle if required
  if (actualStyle.fill && !actualStyle.batch) {
    context.fill();
  }

  // Stroke the rectangle if required
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}

/**
 * Draw a polygon defined by an array of vertices
 */
export function polygon(
  context: CanvasRenderingContext2D,
  vertices: vec2[],
  style?: Partial<StyleOptions>
): void {
  if (vertices.length < 3) {
    return;
  }

  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.fillColor !== null) {
    context.fillStyle = prepareColor(actualStyle.fillColor);
  }
  if (actualStyle.gradient) {
    const gradient = prepareGradient(context, actualStyle.gradient);
    if (gradient) {
      context.fillStyle = gradient;
    }
  }
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path so we can add to any
  // existing path and draw multiple shapes in one go
  if (!actualStyle.batch) {
    context.beginPath();
  }

  // Draw the polygon path
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    context.lineTo(vertices[i].x, vertices[i].y);
  }
  context.closePath();

  // Fill the rectangle if required
  if (actualStyle.fill && !actualStyle.batch) {
    context.fill();
  }

  // Stroke the rectangle if required
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}

/**
 * Draw a path defined by an array of vertices
 */
export function path(
  context: CanvasRenderingContext2D,
  vertices: vec2[],
  style?: Partial<StyleOptions>
): void {
  if (vertices.length < 2) return;

  context.save();

  // Apply styles
  const actualStyle = getStyle(style);
  if (actualStyle.strokeColor !== null) {
    context.strokeStyle = prepareColor(actualStyle.strokeColor);
  }
  if (actualStyle.lineWidth !== null) {
    context.lineWidth = actualStyle.lineWidth;
  }
  if (actualStyle.lineDash !== null) {
    context.setLineDash(actualStyle.lineDash);
  }

  // If this is a batch operation, don't begin a new path
  if (!actualStyle.batch) {
    context.beginPath();
  }

  // Handle different path types
  const pathType = actualStyle.pathType ?? 'linear';

  if (pathType === 'linear') {
    // Simple linear path
    context.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      context.lineTo(vertices[i].x, vertices[i].y);
    }
  } else if (pathType === 'bezier') {
    const order = clamp(actualStyle.bezierOrder ?? 3, 1, 3);

    // Draw bezier curve segments
    const segmentSize = order + 1;
    for (let i = 0; i + segmentSize <= vertices.length; i += order) {
      const segmentPoints = vertices.slice(i, i + segmentSize);

      // Draw first point of segment
      if (i === 0) {
        context.moveTo(segmentPoints[0].x, segmentPoints[0].y);
      }

      // Draw bezier curve through points
      for (let t = 0; t <= 1; t += 0.01) {
        const q = mat.mulv(
          BEZIER_MATRICES[order],
          BEZIER_COEFFICIENTS(t, order as 1 | 2 | 3)
        );
        if (q === false) {
          context.restore();
          return;
        }
        let p = vec2();

        for (let j = 0; j < segmentSize; j++) {
          p.x += segmentPoints[j].x * q[j];
          p.y += segmentPoints[j].y * q[j];
        }

        context.lineTo(p.x, p.y);
      }
    }
  } else if (pathType === 'catmull-rom') {
    const tension = actualStyle.catmullRomTension ?? 0.5;

    // Need at least 4 points for Catmull-Rom
    if (vertices.length >= 4) {
      context.moveTo(vertices[1].x, vertices[1].y);

      // Draw curve segments
      for (let i = 1; i < vertices.length - 2; i++) {
        const points = [
          vertices[i - 1],
          vertices[i],
          vertices[i + 1],
          vertices[i + 2],
        ];

        for (let t = 0; t <= 1; t += 0.01) {
          const x = dot(
            points.map(p => p.x),
            CATMULL_ROM_BASIS_VECTOR(t, tension)
          );
          const y = dot(
            points.map(p => p.y),
            CATMULL_ROM_BASIS_VECTOR(t, tension)
          );
          context.lineTo(x, y);
        }
      }
    } else {
      // Fall back to linear if not enough points
      context.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        context.lineTo(vertices[i].x, vertices[i].y);
      }
    }
  }

  // Stroke the path if required
  if (actualStyle.stroke && !actualStyle.batch) {
    context.stroke();
  }

  context.restore();
}
