const { EventEmitter } = require("events");
const { Shoukaku, Connectors } = require("shoukaku");
const ShoukakuOptions = {
    moveOnDisconnect: false,
    resumable: false,
    resumableTimeout: 30,
    reconnectTries: 15,
    restTimeout: 60000
};
const Player = require("./Player");
const Spotify = require("./module/Spotify");

class FerraLink extends EventEmitter {
    constructor(client, nodes, options) {
        super();
        if (!client) throw new Error("[FerraLink] => You need to provide client.");
        if (!nodes) throw new Error("[FerraLink] => You need to provide nodes.");
        this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, ShoukakuOptions);
        this.players = new Map();
        this.spotify = new Spotify(options);
    }
    getNode() {
        const node = this.shoukaku.getNode();
        if (!node) throw new Error("[FerraLink] => No nodes are existing.");
        return node;
    }
    async createPlayer(options) {
        const existing = this.players.get(options.guildId);
        if (!existing) {
            const node = this.getNode();
            const ShoukakuPlayer = await node.joinChannel({
                guildId: options.guildId,
                channelId: options.voiceId,
                shardId: options.shardId,
                deaf: options.deaf || true,
            });
            if (!ShoukakuPlayer) return null;
            const FerraLinkPlayer = new Player(
                this,
                {
                    guildId: options.guildId,
                    voiceId: options.voiceId,
                    textId: options.textId,
                    volume: options.volume || "80",
                    ShoukakuPlayer
                });
            this.players.set(options.guildId, FerraLinkPlayer);
            this.emit("PlayerCreate", FerraLinkPlayer);
            return FerraLinkPlayer;
        } else {
            return existing;
        }
    }
    async search(query, options) {
        const node = this.getNode();
        let result;
        if (this.spotify.check(query)) {
            result = await this.spotify.resolve(query);
        } else if (this.isCheckURL(query)) {
            result = await node.rest.resolve(query);
        } else {
            const source = options?.engine || "ytsearch";
            if (source === "spsearch") {
                result = await this.spotify.search(query);
            } else {
                result = await node.rest.resolve(`${source}:${query}`);
            }
        }
        return result;
    }
    isCheckURL(string) {
        try {
            new URL(string);
            return true;
        } catch (e) {
            return false;
        }
    }
}
module.exports = FerraLink;
