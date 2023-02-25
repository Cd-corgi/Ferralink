const { EventEmitter } = require('events');
const { Shoukaku } = require('shoukaku');
const Player = require('./Player');
const Spotify = require('./module/Spotify');

class FerraLink extends EventEmitter {
	/**
	 * @param {FerraLinkOptions} options
	 * @param {import("shoukaku").Connector} connector
	 */
	constructor(options, connector) {
		super();

		if (typeof options !== 'object') return console.log("[FerraLink] => FerralinkOptions must be an object");
		if (!options.nodes) return console.log('[FerraLink] => FerralinkOptions must contain a nodes property');
		if (!Array.isArray(options.nodes)) return console.log('[FerraLink] => FerralinkOptions.nodes must be an array');
		if (options.nodes.length === 0) return console.log('[FerraLink] => FerralinkOptions.nodes must contain at least one node');
		if (!options.shoukakuoptions) return console.log('[FerraLink] => FerralinkOptions must contain a shoukakuoptions property');
		if (options?.spotify) {
			if (!options.spotify[0]?.ClientID) return console.log('[FerraLink] => FerralinkOptions.spotify must have ClientID');
			if (!options.spotify[0]?.ClientSecret) return console.log('[FerraLink] => FerralinkOptions.spotify must have ClientSecret');

			if (options.spotify?.length === 1) {
				this.spotify = new Spotify({ ClientID: options.spotify[0]?.ClientID, ClientSecret: options.spotify[0]?.ClientSecret });
			} else {
				for (const client of options.spotify) this.spotify = new Spotify(client);
				console.warn("[FerraLink Spotify] => You are using the multi client mode, sometimes you can STILL GET RATE LIMITED.");
			};
		};

		this.shoukaku = new Shoukaku(connector, options.nodes, options.shoukakuoptions);
		this.players = new Map();
		this.defaultSearchEngine = options?.defaultSearchEngine || 'ytsearch';
	};

	/**
	 * Create a new player.
	 * @param {FerraLinkCreatePlayerOptions} options
	 * @returns {Promise<Player>}
	 */
	async createPlayer(options) {
		const existing = this.players.get(options.guildId);
		if (existing) return existing;

		let node;
		
		if (options.loadBalancer === true) node = this.getLeastUsedNode();
		else node = this.shoukaku.getNode('auto');

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
			volume: options.volume || 80,
			ShoukakuPlayer
		});

		this.players.set(options.guildId, FerraLinkPlayer);
		this.emit('playerCreate', FerraLinkPlayer);

		return FerraLinkPlayer;
	};

	getLeastUsedNode() {
		const nodes = [...this.shoukaku.nodes.values()];
		const onlineNodes = nodes.filter((node) => node);
		if (!onlineNodes.length) return console.log("[FerraLink] => No nodes are online.")
		return onlineNodes.reduce((a, b) => (a.players.size < b.players.size ? a : b));
	};


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
		};

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
			if (options.engine === 'spsearch') {
				if (this.manager.spotify.check(query)) return this.spotify.resolve(query);
				return await this.shoukaku.getNode()?.rest.resolve(query);
			};

			return await this.shoukaku.getNode()?.rest.resolve(query);
		};

		if (options.engine === 'spsearch') return await this.manager.spotify.search(query);

		return await this.shoukaku.getNode()?.rest.resolve(`${options.engine}:${query}`);
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
	};

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
	};
}

module.exports = FerraLink;

/**
 * @typedef FerraLinkOptions
 * @property {import("shoukaku").NodeOption[]} nodes
 * @property {import("shoukaku").ShoukakuOptions} shoukakuoptions
 * @property {Array<{ ClientID: string, ClientSecret: string }>} spotify
 * @property {'ytsearch' | 'ytmsearch' | 'spsearch' | 'scsearch'} defaultSearchEngine
 */

/**
 * @typedef FerraLinkCreatePlayerOptions
 * @property {string} guildId
 * @property {string} voiceId
 * @property {string} textId
 * @property {number} shardId
 * @property {number} [volume]
 * @property {boolean} [deaf]
 */

/**
 * @typedef FerraLinkSearchOptions
 * @property {'ytsearch' | 'ytmsearch' | 'spsearch' | 'scsearch'} [engine]
 */

/**
 * @typedef FerraLinkEvents
 * @property {[player: Player, track: shoukaku.Track]} trackStart
 * @property {[player: Player, track: shoukaku.Track]} trackEnd
 * @property {[player: Player]} queueEnd
 * @property {[player: Player, data: shoukaku.WebSocketClosedEvent]} playerClosed
 * @property {[player: Player, data: shoukaku.TrackExceptionEvent]} trackException
 * @property {[player: Player, data: shoukaku.PlayerUpdate]} playerUpdate
 * @property {[player: Player, data: shoukaku.TrackStuckEvent]} trackStuck
 * @property {[player: Player]} playerResumed
 * @property {[player: Player]} playerDestroy
 * @property {[player: Player]} playerCreate
 */