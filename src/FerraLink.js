const { EventEmitter } = require('events');
const { Shoukaku } = require('shoukaku');
const Player = require('./Player');
const Spotify = require('./module/Spotify');

class FerraLink extends EventEmitter {
	/**
	 * @param {*} client
	 * @param {import('shoukaku').NodeOption[]} nodes
	 * @param {FerraLinkOptions} options
	 */
	constructor(options, connector) {
		super();

		if (typeof options !== 'object') throw new Error("[FerraLink] => FerralinkOptions must be an object");
		if (!options.nodes) throw new Error('[FerraLink] => FerralinkOptions must contain a nodes property');
		if (!Array.isArray(options.nodes)) throw new Error('[FerraLink] => FerralinkOptions.nodes must be an array');
		if (options.nodes.length === 0) throw new Error('[FerraLink] => FerralinkOptions.nodes must contain at least one node');
		if (!options.shoukakuoptions) throw new Error('[FerraLink] => FerralinkOptions must contain a shoukakuoptions property');
		if (options?.spotify) {
			if (!options.spotify[0]?.clientID) throw new Error('[FerraLink] => FerralinkOptions.spotify must have clientID');
			if (!options.spotify[0]?.clientSecret) throw new Error('[FerraLink] => FerralinkOptions.spotify must have clientSecret');

			if (options.spotify?.length === 1) {
				this.spotify = new Spotify({ ClientID: options.spotify[0]?.clientID, ClientSecret: options.spotify[0]?.clientSecret });
			} else {
				for (const client of options.spotify) { this.spotify = new Spotify(client); }
				console.warn("[FerraLink Spotify] => You are using the multi client mode, sometimes you can STILL GET RATE LIMITED.");
			}
		}
		this.shoukaku = new Shoukaku(connector, options.nodes, options.shoukakuoptions);
		this.players = new Map();
		this.defaultSearchEngine = options?.defaultSearchEngine || 'youtube';
	}

	/**
	 * Create a new player.
	 * @param {FerraLinkCreatePlayerOptions} options
	 * @returns {Promise<Player>}
	 */
	async createPlayer(options) {
		const existing = this.players.get(options.guildId);
		if (existing) return existing;

		let node;
		if (options.loadBalancer === true) {
			node = this.getLeastUsedNode();
		} else { 
			node = this.shoukaku.getNode('auto'); 
		}
		if (node === null) return console.log('[FerraLink] => No nodes are existing.');

		const ShoukakuPlayer = await node.joinChannel({
			guildId: options.guildId,
			channelId: options.voiceId,
			shardId: options.shardId,
			deaf: options.deaf || true
		});
		const FerraLinkPlayer = new Player(this, {
			guildId: options.guildId,
			voiceId: options.voiceId,
			textId: options.textId,
			volume: `${options.volume}` || '80',
			ShoukakuPlayer
		});
		this.players.set(options.guildId, FerraLinkPlayer);
		this.emit('PlayerCreate', FerraLinkPlayer);
		return FerraLinkPlayer;
	}

	getLeastUsedNode() {
		const nodes = [...this.shoukaku.nodes.values()];
		const onlineNodes = nodes.filter((node) => node);
		if (!onlineNodes.length) return console.log("[FerraLink] => No nodes are online.")
		return onlineNodes.reduce((a, b) => (a.players.size < b.players.size ? a : b));
	}


	/**
	* Resolve a track
	* @param {shoukaku.Track} track
	* @returns {Promise<shoukaku.Track>}
	*/
	async resolve(track, node) {
		const query = [track.info.author, track.info.title].filter(x => !!x).join(' - ');
		let result = await node.rest.resolve(`ytmsearch:${query}`);
		if (!result || !result.tracks.length) {
			result = await node.rest.resolve(`ytsearch:${query}`);
			if (!result || !result.tracks.length) return;
		}
		track.track = result.tracks[0].track;
		return track;
	}

	/**
	 * Search a song in Lavalink providers.
	 * @param {string} query
	 * @param {FerraLinkSearchOptions} options
	 * @returns {Promise<shoukaku.LavalinkResponse>}
	 */
	async search(query, options = { engine: this.defaultSearchEngine }) {
		if (/^https?:\/\//.test(query)) {
			if (options.engine === 'FerralinkSpotify') {
				if (this.spotify.check(query)) {
					return await this.spotify.resolve(query);
				}
				return await this.shoukaku.getNode()?.rest.resolve(query);
			}
			return await this.shoukaku.getNode()?.rest.resolve(query);
		}
		if (options.engine === 'FerralinkSpotify') return await this.spotify.search(query);
		const engineMap = {
			youtube: 'ytsearch',
			youtubemusic: 'ytmsearch',
			soundcloud: 'scsearch',
			spotify: 'spsearch',
			deezer: "dzsearch",
			yandex: 'ymsearch'
		};
		return await this.shoukaku.getNode()?.rest.resolve(`${engineMap[options.engine]}:${query}`);
	}

	/**
	 * Add a listener to a event.
	 * @template {keyof FerraLinkEvents} K
	 * @param {K} event
	 * @param {(...args: FerraLinkEvents[K]) => any} listener
	 * @returns {FerraLink}
	 */
	on(event, listener) {
		super.on(event, listener);
		return this;
	}

	/**
	 * Add a "unique" listener to an event.
	 * @template {keyof FerraLinkEvents} K
	 * @param {K} event
	 * @param {(...args: FerraLinkEvents[K]) => any} listener
	 * @returns {FerraLink}
	 */
	once(event, listener) {
		super.once(event, listener);
		return this;
	}
}

module.exports = FerraLink;

/**
 * @typedef FerraLinkOptions
 * @property {FerraLinkSpotifyOptions} [spotify]
 */

/**
 * @typedef FerraLinkSpotifyOptions
 * @property {number} playlistLimit
 * @property {number} albumLimit
 * @property {number} artistLimit
 * @property {string} searchMarket
 * @property {string} clientID
 * @property {string} clientSecret
 */

/**
 * @typedef FerraLinkCreatePlayerOptions
 * @prop {string} guildId
 * @prop {string} voiceId
 * @prop {string} textId
 * @prop {number} shardId
 * @prop {number} [volume]
 * @prop {boolean} [deaf]
 */

/**
 * @typedef FerraLinkSearchOptions
 * @prop {'ytsearch' | 'ytmsearch' | 'spsearch' | 'scsearch'} [engine]
 */

/**
 * @typedef FerraLinkEvents
 * @prop {[player: Player, track: shoukaku.Track]} trackStart
 * @prop {[player: Player, track: shoukaku.Track]} trackEnd
 * @prop {[player: Player]} queueEnd
 * @prop {[player: Player, data: shoukaku.WebSocketClosedEvent]} PlayerClosed
 * @prop {[player: Player, data: shoukaku.TrackExceptionEvent]} trackException
 * @prop {[player: Player, data: shoukaku.PlayerUpdate]} PlayerUpdate
 * @prop {[player: Player, data: shoukaku.TrackStuckEvent]} trackStuck
 * @prop {[player: Player]} PlayerResumed
 * @prop {[player: Player]} playerDestroy
 * @prop {[player: Player]} playerCreate
 */
