import JagFile from '#/io/JagFile.js';
import Packet from '#/io/Packet.js';

export default class FloType {
    static numDefinitions: number = 0;
    static list: FloType[] = [];

    colour: number = 0;
    mapcolour: number = -1;
    texture: number = -1;
    overlay: boolean = false;
    occlude: boolean = true;
    showunderlay: boolean = false;
    debugname: string = '';

    hue: number = 0;
    saturation: number = 0;
    lightness: number = 0;

    chroma: number = 0;
    underlayHue: number = 0;
    overlayHsl: number = 0;
    mapHue: number = 0;
    mapSaturation: number = 0;
    mapLightness: number = 0;
    mapOverlayHsl: number = 0;

    static init(config: JagFile): void {
        const dat: Packet = new Packet(config.read('flo.dat'));

        this.numDefinitions = dat.g2();
        this.list = new Array(this.numDefinitions);

        for (let id: number = 0; id < this.numDefinitions; id++) {
            if (!this.list[id]) {
                this.list[id] = new FloType();
            }

            this.list[id].decode(dat);
        }
    }

    decode(dat: Packet): void {
        while (true) {
            const code = dat.g1();
            if (code === 0) {
                break;
            }

            if (code === 1) {
                this.colour = dat.g3();
                this.getHsl(this.colour);
            } else if (code === 8) {
                this.mapcolour = dat.g3();
                const mapHsl = this.getHslValues(this.mapcolour);
                this.mapHue = mapHsl.hue;
                this.mapSaturation = mapHsl.saturation;
                this.mapLightness = mapHsl.lightness;
                this.mapOverlayHsl = FloType.packHsl(mapHsl.hue, mapHsl.saturation, mapHsl.lightness);
            } else if (code === 2) {
                this.texture = dat.g1();
            } else if (code === 3) {
                this.overlay = true;
            } else if (code === 5) {
                this.occlude = false;
            } else if (code === 7) {
                this.showunderlay = true;
            } else if (code === 6) {
                this.debugname = dat.gjstr();
            } else {
                console.log('Error unrecognised config code: ', code);
            }
        }
    }

    private getHsl(rgb: number): void {
        const hsl = this.getHslValues(rgb);

        this.hue = hsl.hue;
        this.saturation = hsl.saturation;
        this.lightness = hsl.lightness;
        this.chroma = hsl.chroma;
        this.underlayHue = hsl.underlayHue;
        this.overlayHsl = FloType.randomizeOverlayHsl(hsl.hue, hsl.saturation, hsl.lightness);
    }

    private getHslValues(rgb: number): { hue: number; saturation: number; lightness: number; chroma: number; underlayHue: number; overlayHsl: number } {
        const red: number = ((rgb >> 16) & 0xff) / 256.0;
        const green: number = ((rgb >> 8) & 0xff) / 256.0;
        const blue: number = (rgb & 0xff) / 256.0;

        let min: number = red;
        if (green < red) {
            min = green;
        }
        if (blue < min) {
            min = blue;
        }

        let max: number = red;
        if (green > red) {
            max = green;
        }
        if (blue > max) {
            max = blue;
        }

        let h: number = 0.0;
        let s: number = 0.0;
        const l: number = (min + max) / 2.0;

        if (min !== max) {
            if (l < 0.5) {
                s = (max - min) / (max + min);
            }
            if (l >= 0.5) {
                s = (max - min) / (2.0 - max - min);
            }

            if (red === max) {
                h = (green - blue) / (max - min);
            } else if (green === max) {
                h = (blue - red) / (max - min) + 2.0;
            } else if (blue === max) {
                h = (red - green) / (max - min) + 4.0;
            }
        }

        h /= 6.0;

        let hue: number = (h * 256.0) | 0;
        let saturation: number = (s * 256.0) | 0;
        let lightness: number = (l * 256.0) | 0;
        if (saturation < 0) {
            saturation = 0;
        } else if (saturation > 255) {
            saturation = 255;
        }

        if (lightness < 0) {
            lightness = 0;
        } else if (lightness > 255) {
            lightness = 255;
        }

        let chroma: number;
        if (l > 0.5) {
            chroma = ((1.0 - l) * s * 512.0) | 0;
        } else {
            chroma = (l * s * 512.0) | 0;
        }

        if (chroma < 1) {
            chroma = 1;
        }

        return {
            hue,
            saturation,
            lightness,
            chroma,
            underlayHue: (h * chroma) | 0,
            overlayHsl: FloType.packHsl(hue, saturation, lightness)
        };
    }

    private static packHsl(hue: number, saturation: number, lightness: number): number {
        let packedSaturation = saturation;

        if (lightness > 179) {
            packedSaturation = packedSaturation >> 1;
        }
        if (lightness > 192) {
            packedSaturation = packedSaturation >> 1;
        }
        if (lightness > 217) {
            packedSaturation = packedSaturation >> 1;
        }
        if (lightness > 243) {
            packedSaturation = packedSaturation >> 1;
        }

        return (((hue / 4) | 0) << 10) + (((packedSaturation / 32) | 0) << 7) + ((lightness / 2) | 0);
    }

    private static randomizeOverlayHsl(hue: number, saturation: number, lightness: number): number {
        let randomizedHue: number = hue + ((Math.random() * 16.0) | 0) - 8;
        if (randomizedHue < 0) {
            randomizedHue = 0;
        } else if (randomizedHue > 255) {
            randomizedHue = 255;
        }

        let randomizedSaturation: number = saturation + ((Math.random() * 48.0) | 0) - 24;
        if (randomizedSaturation < 0) {
            randomizedSaturation = 0;
        } else if (randomizedSaturation > 255) {
            randomizedSaturation = 255;
        }

        let randomizedLightness: number = lightness + ((Math.random() * 48.0) | 0) - 24;
        if (randomizedLightness < 0) {
            randomizedLightness = 0;
        } else if (randomizedLightness > 255) {
            randomizedLightness = 255;
        }

        return FloType.getTable(randomizedHue, randomizedSaturation, randomizedLightness);
    }

    static getTable(hue: number, saturation: number, lightness: number): number {
        if (lightness > 179) {
            saturation = (saturation / 2) | 0;
        }

        if (lightness > 192) {
            saturation = (saturation / 2) | 0;
        }

        if (lightness > 217) {
            saturation = (saturation / 2) | 0;
        }

        if (lightness > 243) {
            saturation = (saturation / 2) | 0;
        }

        return (((hue / 4) | 0) << 10) + (((saturation / 32) | 0) << 7) + ((lightness / 2) | 0);
    }
}
