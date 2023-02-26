export = Spotify;
declare class Spotify {
    constructor(manager?: FerraLink);
    private manager;
    private baseURL;
    private options;
    private authorization;
    private interval;
    check(url: string): boolean;
    requestAnonymousToken(): Promise<void>;
    token: string | undefined;
    requestToken(): Promise<void>;
    private renew;
    requestData(endpoint: string): unknown;
    resolve(url: string): shoukaku.LavalinkResponse;
    fetchPlaylist(id: string): shoukaku.LavalinkResponse;
    fetchAlbum(id: string): shoukaku.LavalinkResponse;
    fetchArtist(id: string): shoukaku.LavalinkResponse;
    fetchTrack(id: string): shoukaku.LavalinkResponse;
    search(query: string): shoukaku.LavalinkResponse;
    fetchPlaylistTracks(spotifyPlaylist: unknown): Promise<void>;
    buildUnresolved(track: Record<string, unknown>): Promise<shoukaku.LavalinkResponse>;
    fetchMetaData(track: shoukaku.Track): Promise<shoukaku.Track>;
    buildTrack(unresolvedTrack: Record<string, unknown>): shoukaku.Track;
    compareValue(value: unknown): boolean;
    buildResponse(loadType: shoukaku.LoadType, tracks: shoukaku.Track[], playlistName?: string | undefined, exceptionMsg?: string | undefined): shoukaku.LavalinkResponse;
}
import shoukaku = require("shoukaku");
import FerraLink = require("../FerraLink");
