import { vec2 } from '@basementuniverse/vec';
export type Color = {
    r: number;
    g: number;
    b: number;
    a?: number;
};
/**
 * Clear the pattern cache for a specific image, or clear the entire cache
 * if no image is specified. Useful for memory management.
 */
export declare function clearPatternCache(image?: CanvasImageSource): void;
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
        type?: 'caret' | 'chevron' | ((context: CanvasRenderingContext2D, ...args: any[]) => void);
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
     * When drawing rectangles, which point the position refers to
     *
     * Default is 'top-left'
     */
    rectangleAnchor?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    /**
     * Options for drawing images
     */
    image?: {
        /**
         * How to scale the image to fit the specified rectangle
         *
         * If a rectangle size is not specified, we draw the image at its natural
         * size (same as 'center' mode)
         *
         * - 'center': Draw the image at its natural size, centered in the rectangle
         * - 'stretch': Stretch the image to fill the entire rectangle (may distort)
         * - 'contain': Scale the image to fit entirely within the rectangle,
         *   preserving aspect ratio
         * - 'fill': Scale the image to completely cover the rectangle,
         *   preserving aspect ratio (the image might overflow the rectangle)
         * - 'fit-x': Scale the image to fit the width of the rectangle,
         *   preserving aspect ratio (the image might overflow the rectangle height)
         * - 'fit-y': Scale the image to fit the height of the rectangle,
         *   preserving aspect ratio (the image might overflow the rectangle width)
         */
        fillMode?: 'center' | 'stretch' | 'contain' | 'fill' | 'fit-x' | 'fit-y';
        /**
         * If true, and the image is larger than the rectangle, clip the image to
         * the bounds of the rectangle
         *
         * Ignored if a rectangle size is not specified
         */
        clip?: boolean;
        /**
         * How to repeat the image if the rectangle is larger than the image size
         *
         * Ignored if a rectangle size is not specified
         */
        repeatMode?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
        /**
         * The opacity of the image (0-1)
         */
        opacity?: number;
        /**
         * The scale to draw the image at (calculated after applying the fillMode)
         *
         * This can be a single number to scale uniformly, or a vec2 for
         * non-uniform scaling
         */
        scale?: number | vec2;
        /**
         * Translation offset to apply when drawing the image
         *
         * This is calculated after applying the fillMode and scale
         */
        offset?: vec2;
        /**
         * If true, the offset is treated as relative to the rectangle size (e.g.
         * an offset of { x: 0.5, y: 0.5 } moves the image down and right by half
         * the rectangle's size)
         */
        offsetRelative?: boolean;
    };
    /**
     * Additional custom properties for future extensions
     */
    [key: string]: any;
};
/**
 * Pass in a context and some number of functions that take a context as their
 * first argument, and return an array of functions that don't require the
 * context argument
 *
 * If only one function is passed, this will return a single function
 */
export declare function withContext(context: CanvasRenderingContext2D, ...functions: ((context: CanvasRenderingContext2D, ...args: any[]) => void)[]): ((...args: any[]) => void) | ((...args: any[]) => void)[];
/**
 * Draw a straight line segment between two points
 */
export declare function line(context: CanvasRenderingContext2D, start: vec2, end: vec2, style?: Partial<StyleOptions>): void;
/**
 * Draw a cross at a given position with a specified size
 */
export declare function cross(context: CanvasRenderingContext2D, position: vec2, size: number, style?: Partial<StyleOptions>): void;
/**
 * Draw an arrow from a start point to an end point with an optional arrowhead
 * at the end
 *
 * This function does not support batch drawing since it requires
 * beginning a new path for the arrowhead
 */
export declare function arrow(context: CanvasRenderingContext2D, start: vec2, end: vec2, style?: Partial<StyleOptions>): void;
/**
 * Draw a circle at a specified center point with a given radius
 */
export declare function circle(context: CanvasRenderingContext2D, center: vec2, radius: number, style?: Partial<StyleOptions>): void;
/**
 * Draw a rectangle at a specified position with a given size
 */
export declare function rectangle(context: CanvasRenderingContext2D, position: vec2, size: vec2, style?: Partial<StyleOptions>): void;
/**
 * Draw a polygon defined by an array of vertices
 */
export declare function polygon(context: CanvasRenderingContext2D, vertices: vec2[], style?: Partial<StyleOptions>): void;
/**
 * Draw a path defined by an array of vertices
 */
export declare function path(context: CanvasRenderingContext2D, vertices: vec2[], style?: Partial<StyleOptions>): void;
/**
 * Draw an image at a specified position, optionally scaling it to fit within
 * a given rectangle
 */
export declare function image(context: CanvasRenderingContext2D, image: CanvasImageSource, position: vec2, size?: vec2, style?: Partial<StyleOptions>): void;
export {};
