/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

declare namespace croppie {
    type WheelZoomType = 'ctrl';

    type ViewportType = 'square' | 'circle';

    type ImageUrl = string;

    // String representation as returned by Number.prototype.toFixed()
    type Point = string | number;

    // [topLeftX, topLeftY, bottomRightX, bottomRightY]
    type Points = [Point, Point, Point, Point];

    type Orientation = number;

    type Type = 'canvas' | 'base64' | 'html' | 'blob' | 'rawcanvas';

    type Size = 'viewport' | 'original' | { width: number, height: number };

    type Format = 'jpeg' | 'png' | 'webp';

    type Degrees = 90 | 180 | 270 | -90 | -180 | -270;

    // Dispatched on element constructed on as 'update.croppie'
    type UpdateEvent = CustomEvent<State>;

    interface Viewport {
        width?: number,
        height?: number,
        type?: ViewportType,
    }

    interface Boundary {
        width?: number,
        height: number,
    }

    interface ResizeControls {
        width?: boolean,
        height?: boolean,
    }

    interface CreateOptions {
        viewport?: Viewport,
        boundary?: Boundary,
        resizeControls?: ResizeControls,
        customClass?: string,
        showZoomer?: boolean,
        enableZoom?: boolean,
        enableResize?: boolean,
        mouseWheelZoom?: boolean | WheelZoomType,
        enableExif?: boolean,
        enforceBoundary?: boolean,
        enableOrientation?: boolean,
        enableKeyMovement?: boolean,
        url?: ImageUrl,
        points?: Points,
        update?: (UpdateEvent) => void,
    }

    interface State {
        points: Points;
        zoom: number,
        orientation?: Orientation,
    }

    interface BindOptions {
        url?: ImageUrl,
        points?: Points,
        zoom?: number,
        orientation?: Orientation,
    }

    interface ResultOptions {
        type?: Type;
        size?: Size;
        format?: Format;
        quality?: number; // Range: [0..1]
        backgroundColor?: string,
        circle?: boolean;
    }
}

declare class Croppie {
    constructor(element: HTMLElement, options?: croppie.CreateOptions);
    get(): croppie.State;
    bind(options?: croppie.BindOptions | croppie.ImageUrl | croppie.Points): Promise<void>;
    destroy(): void;
    result(options: croppie.ResultOptions & { type: 'base64' | 'canvas' }): Promise<string>;
    result(options: croppie.ResultOptions & { type: 'html' }): Promise<HTMLElement>;
    result(options: croppie.ResultOptions & { type: 'blob' }): Promise<Blob>;
    result(options: croppie.ResultOptions & { type: 'rawcanvas' }): Promise<HTMLCanvasElement>;
    result(options?: croppie.ResultOptions): Promise<HTMLCanvasElement>;
    rotate(degrees: croppie.Degrees): void;
    setZoom(zoom: number): void;
    destroy(): void;
}
