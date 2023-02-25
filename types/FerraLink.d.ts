export = FerraLink;
declare class FerraLink {
    constructor(options: FerraLinkOptions, connector: import("shoukaku").Connector);
    spotify: Spotify | undefined;
    shoukaku: Shoukaku | undefined;
    players: Map<any, any> | undefined;
    defaultSearchEngine: "ytsearch" | "ytmsearch" | "spsearch" | "scsearch" | undefined;
    createPlayer(options: FerraLinkCreatePlayerOptions): Promise<Player>;
    getLeastUsedNode(): any;
    resolve(track: shoukaku.Track, node: any): Promise<shoukaku.Track>;
    search(query: string, options?: FerraLinkSearchOptions): Promise<shoukaku.LavalinkResponse>;
    on<K extends keyof FerraLinkEvents>(event: K, listener: (...args: FerraLinkEvents[K]) => any): FerraLink;
    once<K_1 extends keyof FerraLinkEvents>(event: K_1, listener: (...args: FerraLinkEvents[K_1]) => any): FerraLink;
}
declare namespace FerraLink {
    export { FerraLinkOptions, FerraLinkCreatePlayerOptions, FerraLinkSearchOptions, FerraLinkEvents };
}
import Spotify = require("./module/Spotify");
import { Shoukaku } from "shoukaku/dist/src/Shoukaku";
type FerraLinkCreatePlayerOptions = {
    guildId: string;
    voiceId: string;
    textId: string;
    shardId: number;
    volume?: number | undefined;
    deaf?: boolean | undefined;
};
import Player = require("./Player");
type FerraLinkSearchOptions = {
    engine?: "ytsearch" | "ytmsearch" | "spsearch" | "scsearch" | undefined;
};
type FerraLinkEvents = {
    trackStart: [player: Player, track: shoukaku.Track];
    trackEnd: [player: Player, track: shoukaku.Track];
    queueEnd: [player: Player];
    playerClosed: [player: Player, data: shoukaku.WebSocketClosedEvent];
    trackException: [player: Player, data: shoukaku.TrackExceptionEvent];
    playerUpdate: [player: Player, data: shoukaku.PlayerUpdate];
    trackStuck: [player: Player, data: shoukaku.TrackStuckEvent];
    playerResumed: [player: Player];
    playerDestroy: [player: Player];
    playerCreate: [player: Player];
};
type FerraLinkOptions = {
    nodes: import("shoukaku").NodeOption[];
    shoukakuoptions: import("shoukaku").ShoukakuOptions;
    spotify: Array<{
        ClientID: string;
        ClientSecret: string;
    }>;
    defaultSearchEngine: 'ytsearch' | 'ytmsearch' | 'spsearch' | 'scsearch';
};
