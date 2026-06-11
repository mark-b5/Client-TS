import { canvas2d } from '#/graphics/Canvas.js';
import Pix2D from '#/graphics/Pix2D.js';

export default class PixMap {
    readonly data: Int32Array;
    private readonly width: number;
    private readonly height: number;
    private readonly img: ImageData;

    private readonly ctx: CanvasRenderingContext2D;
    private readonly paint: Uint32Array;

    // Render-scale: the whole client composites at displayScale (2 = render everything 2x). draw() takes
    // LOGICAL coordinates and maps them to the (2x) backing. A buffer already rendered above 1x (the world)
    // sets contentScale so it blits 1:1 instead of being pixel-doubled again.
    static displayScale: number = 1;
    contentScale: number = 1;
    private scaledCanvas: HTMLCanvasElement | null = null;
    private scaledCtx: CanvasRenderingContext2D | null = null;

    constructor(width: number, height: number, ctx: CanvasRenderingContext2D = canvas2d) {
        this.width = width;
        this.height = height;
        this.data = new Int32Array(width * height);

        this.ctx = ctx;
        this.img = this.ctx.createImageData(width, height);
        this.paint = new Uint32Array(this.img.data.buffer);

        this.setPixels();
    }

    setPixels(): void {
        Pix2D.setPixels(this.data, this.width, this.height);
    }

    draw(x: number, y: number): void {
        this.prepareCanvas();
        const display: number = PixMap.displayScale;
        const upscale: number = display / this.contentScale;
        const dx: number = (x * display) | 0;
        const dy: number = (y * display) | 0;
        if (upscale === 1) {
            this.ctx.putImageData(this.img, dx, dy);
            return;
        }
        // Pixel-double (or N-x) this 1x buffer up to the backing: putImageData can't scale, so stage it on
        // an offscreen canvas and drawImage with smoothing off (crisp nearest-neighbour).
        if (!this.scaledCanvas) {
            this.scaledCanvas = document.createElement('canvas');
            this.scaledCanvas.width = this.width;
            this.scaledCanvas.height = this.height;
            this.scaledCtx = this.scaledCanvas.getContext('2d');
        }
        this.scaledCtx!.putImageData(this.img, 0, 0);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.scaledCanvas!, dx, dy, (this.width * upscale) | 0, (this.height * upscale) | 0);
    }

    private prepareCanvas(): void {
        const data = this.data;
        const paint = this.paint;
        const len = data.length;

        let i = 0;
        const unroll = len - (len % 4);

        for (; i < unroll; i += 4) {
            const p0 = data[i];
            const p1 = data[i + 1];
            const p2 = data[i + 2];
            const p3 = data[i + 3];

            paint[i] = ((p0 & 0xff0000) >> 16) | (p0 & 0xff00) | ((p0 & 0xff) << 16) | 0xff000000;
            paint[i + 1] = ((p1 & 0xff0000) >> 16) | (p1 & 0xff00) | ((p1 & 0xff) << 16) | 0xff000000;
            paint[i + 2] = ((p2 & 0xff0000) >> 16) | (p2 & 0xff00) | ((p2 & 0xff) << 16) | 0xff000000;
            paint[i + 3] = ((p3 & 0xff0000) >> 16) | (p3 & 0xff00) | ((p3 & 0xff) << 16) | 0xff000000;
        }

        for (; i < len; i++) {
            const pixel = data[i];
            paint[i] = ((pixel & 0xff0000) >> 16) | (pixel & 0xff00) | ((pixel & 0xff) << 16) | 0xff000000;
        }
    }
}
