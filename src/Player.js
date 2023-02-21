const Queue = require('./Queue');
const FerraLink = require('./FerraLink');
const shoukaku = require('shoukaku');

class Player {
	/**
	 *
	 * @param {FerraLink} manager
	 * @param {PlayerOptions} options
	 */
	constructor(manager, options) {
		/** @type {FerraLink} */
		this.manager = manager;
		
		/** @type {string} */
		this.guildId = options.guildId;

		/** @type {string} */
		this.voiceId = options.voiceId;

		/** @type {string} */
		this.textId = options.textId;

		/** @type {number} */
		this.volume = options.volume;

		/** @type {shoukaku.Player} */
		this.shoukaku = options.ShoukakuPlayer;

		/** @type {Queue} */
		this.queue = new Queue();

		/** @type {boolean} */
		this.paused = false;

		/** @type {boolean} */
		this.playing = false;

		/** @type {Map<any, any>} */
		this.data = new Map();

		/** @type {LoopType} */
		this.loop = 'none';

		this.shoukaku.on('start', () => {
			this.playing = true;
			this.manager.emit('trackStart', this, this.queue.current);
		});
		this.shoukaku.on('end', () => {
			if (this.loop === 'track' && this.queue.current) this.queue.unshift(this.queue.current);
			if (this.loop === 'queue' && this.queue.current) this.queue.push(this.queue.current);

			this.queue.previous = this.queue.current;
			const current = this.queue.current;
			this.queue.current = null;

			if (this.queue.length) {
				this.manager.emit('trackEnd', this, current);
			} else {
				this.playing = false;
				return this.manager.emit('queueEnd', this);
			}
			this.play();
		});
		this.shoukaku.on('closed', (data = WebSocketClosedEvent) => {
			this.playing = false;
			this.manager.emit('PlayerClosed', this, data);
		});
		this.shoukaku.on('exception', (data = TrackExceptionEvent) => {
			this.playing = false;
			this.manager.emit('trackException', this, data);
		});
		this.shoukaku.on('update', (data = PlayerUpdate) => this.manager.emit('PlayerUpdate', this, data));
		this.shoukaku.on('stuck', (data = TrackStuckEvent) => this.manager.emit('trackStuck', this, data));
		this.shoukaku.on('resumed', () => this.manager.emit('PlayerResumed', this));
	}

	/**
	 * Pause or resume the player
	 * @param {boolean} [pause]
	 * @returns {Player}
	 */
	pause(pause = true) {
		if (typeof pause !== 'boolean') throw new RangeError('[FerraLink] => Pause function must be pass with boolean value.');
		if (this.paused === pause || !this.queue.totalSize) return this;
		this.paused = pause;
		this.playing = !pause;
		this.shoukaku.setPaused(pause);
		return this;
	}

	/**
	 * Skip the current track
	 * @returns {Player}
	 */
	skip() {
		this.shoukaku.stopTrack();
		return this;
	}

	/**
	 * Seek to specific time
	 * @param {number} position time in ms
	 * @returns {Player}
	 */
	seekTo(position) {
		if (Number.isNaN(position)) throw new RangeError('[FerraLink] => seek Position must be a number.');
		this.shoukaku.seekTo(position);
		return this;
	}

	/**
	 * Set the volume
	 * @param {number} volume
	 * @returns {Player}
	 */
	setVolume(volume) {
		if (Number.isNaN(volume)) throw new RangeError('[FerraLink] => Volume level must be a number.');
		this.shoukaku.setVolume(volume / 100);
		this.volume = volume;
		return this;
	}

	/**
	 * Change player's text channel
	 * @param {string} textId
	 * @returns {Player}
	 */
	setTextChannel(textId) {
		if (typeof textId !== 'string') throw new RangeError('[FerraLink] => textId must be a string.');
		this.textId = textId;
		return this;
	}

	/**
	 * Change player's voice channel
	 * @param {string} voiceId
	 * @returns {Player}
	 */
	setVoiceChannel(voiceId) {
		if (typeof voiceId !== 'string') throw new RangeError('[FerraLink] => voiceId must be a string.');
		this.voiceId = voiceId;
		return this;
	}

	/**
	 * Change the player's loop mode
	 * @param {LoopType} method
	 * @returns {Player}
	 */
	setLoop(method) {
		if (!method) throw new Error('[FerraLink] => You must have to provide loop method as argument for setLoop.');
		if (method === 'track' || method === 'queue') {
			this.loop = method;
			return this;
		}
		this.loop = 'none';
		return this;
	}
	
	/**
	 * Search a song in Lavalink providers.
	 * @param {string} query
	 * @param {FerraLink.FerraLinkSearchOptions} options
	 * @returns {Promise<shoukaku.LavalinkResponse>}
	 */
	async search(query, user, engine = this.manager.defaultSearchEngine) {
		if (/^https?:\/\//.test(query)) {
			if (engine === 'FerralinkSpotify') {
				if (this.manager.spotify.check(query)) {
				    return await this.manager.spotify.resolve(query);
				}
				return await this.shoukaku.node.rest.resolve(query);
			}
			return await this.shoukaku.node.rest.resolve(query);
		}
		if (engine === 'FerralinkSpotify') return await this.manager.spotify.search(query);
		const engineMap = {
			youtube: 'ytsearch',
			youtubemusic: 'ytmsearch',
			soundcloud: 'scsearch',
			spotify: 'spsearch',
			dezzer: "dzsearch",
			yandex: 'ymsearch'
		};
		return await this.shoukaku.node.rest.resolve(`${engineMap[engine]}:${query}`);
	}

	/**
	 * Play the queue
	 * @returns {Promise<void>}
	 */
	async play() {
		if (!this.queue.length) return;
		this.queue.current = this.queue.shift();
		try {
			if (!this.queue.current.track) this.queue.current = await this.manager.resolve(this.queue.current, this.shoukaku.node);
			this.shoukaku
				.setVolume(this.volume / 100)
				.playTrack({ track: this.queue.current.track });
		} catch (e) {
			this.manager.emit('trackError', this, this.queue.current, e);
		}
	}

	/**
	 * Disconnect the player
	 * @returns {void}
	 */
	disconnect() {
		this.pause(true);
        this.manager.sendWs(this.guild, {
            op: 4,
            d: {
                guild_id: this.guild,
                channel_id: null,
                self_mute: false,
                self_deaf: false,
            },
        });
		this.voiceId = null;
		return this;
	}

	/**
	 * Destroy the player
	 * @returns {void}
	 */
	destroy() {
		this.disconnect();
		this.shoukaku.connection.disconnect();
		this.shoukaku.removeAllListeners();
		this.manager.players.delete(this.guildId);
		this.manager.emit('PlayerDestroy', this);
	}
}

module.exports = Player;

/**
 * @typedef PlayerOptions
 * @prop {string} guildId
 * @prop {string} voiceId
 * @prop {string} textId
 * @prop {number} volume
 * @prop {shoukaku.Player} ShoukakuPlayer
 */

/**
 * @typedef {'none' | 'track' | 'queue'} LoopType
 */
