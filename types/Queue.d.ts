export = Queue;
declare class Queue extends Array<shoukaku.Track> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: shoukaku.Track[]);
    get size(): number;
    get totalSize(): number;
    current: shoukaku.Track | null | undefined;
    previous: shoukaku.Track | null | undefined;
    get isEmpty(): boolean;
    get durationLength(): number;
    add(track: shoukaku.Track, options: any): Queue;
    remove(index: number): Queue;
    clear(): Queue;
    shuffle(): void;
}
import shoukaku = require("shoukaku");
