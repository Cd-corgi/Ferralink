const { fetch } = require('undici');
const FerraLink = require('../FerraLink');
const shoukaku = require('shoukaku');
const Pattern =
	/^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/;

class Spotify {
	/**
	 * @param {FerraLink} manager
	 */
	constructor(manager = { ClientID: string, ClientSecret: string }) {
		/** @private */
		this.manager = manager;

		/** @private */
		this.baseURL = 'https://api.spotify.com/v1';

		/** @private */
		this.options = {
			playlistLimit: manager?.PlaylistLimit || 5,
			albumLimit: manager?.AlbumLimit || 5,
			artistLimit: manager?.ArtistLimit || 5,
			searchMarket: manager?.SearchMarket || 'US',
			clientID: manager?.ClientID || null,
			clientSecret: manager?.ClientSecret || null
		};

		/** @private */
		this.authorization = Buffer.from(
			`${this.options.clientID}:${this.options.clientSecret}`
		).toString('base64');

		/** @private */
		this.interval = 0;
	}

	/**
	 * Checks if an url is a Spotify url.
	 * @param {string} url
	 * @returns {boolean}
	 */
	check(url) {
		return Pattern.test(url);
	}

	/**
	 * Request an anonymous token.
	 * @returns {Promise<void>}
	 */
	async requestAnonymousToken() {
		try {
			const data = await fetch(
				'https://open.spotify.com/get_access_token?reason=transport&productType=embed',
				{
					headers: {
						'User-Agent':
							'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36'
					}
				}
			);

			const body = await data.json();
			this.token = `Bearer ${body.accessToken}`;
			this.interval = body.accessTokenExpirationTimestampMs * 1000;
		} catch (e) {
			if (e.status === 400) {
				throw new Error('Invalid Spotify client.');
			}
		}
	}

	/**
	 * Request a token using credentials.
	 * @returns {Promise<void>}
	 */
	async requestToken() {
		if (!this.options.clientID && !this.options.clientSecret) return this.requestAnonymousToken();

		try {
			const data = await fetch(
				'https://accounts.spotify.com/api/token?grant_type=client_credentials',
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${this.authorization}`,
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			);

			const body = await data.json();

			this.token = `Bearer ${body.access_token}`;
			this.interval = body.expires_in * 1000;
		} catch (e) {
			if (e.status === 400) {
				throw new Error('Invalid Spotify client.');
			}
		}
	}

	/**
	 * Renovate the token.
	 * @private
	 * @returns {Promise<void>}
	 */
	async renew() {
		if (Date.now() >= this.interval) {
			await this.requestToken();
		}
	}

	/**
	 * Request data from the Spotify API.
	 * @param {string} endpoint
	 * @returns {unknown}
	 */
	async requestData(endpoint) {
		await this.renew();

		const req = await fetch(`${this.baseURL}${/^\//.test(endpoint) ? endpoint : `/${endpoint}`}`, {
			headers: { Authorization: this.token }
		});
		const data = await req.json();
		return data;
	}

	/**
	 * Create a Lavalink response from a Spotify url.
	 * @param {string} url
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async resolve(url) {
		if (!this.token) await this.requestToken();
		const [, type, id] = Pattern.exec(url) ?? [];

		switch (type) {
			case 'playlist': {
				return this.fetchPlaylist(id);
			}
			case 'track': {
				return this.fetchTrack(id);
			}
			case 'album': {
				return this.fetchAlbum(id);
			}
			case 'artist': {
				return this.fetchArtist(id);
			}
		}
	}

	/**
	 * Fetch a playlist from Spotify.
	 * @param {string} id
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async fetchPlaylist(id) {
		try {
			const playlist = await this.requestData(`/playlists/${id}`);
			await this.fetchPlaylistTracks(playlist);

			const limitedTracks = this.options.playlistLimit
				? playlist.tracks.items.slice(0, this.options.playlistLimit * 100)
				: playlist.tracks.items;

			const unresolvedPlaylistTracks = await Promise.all(
				limitedTracks.map(x => this.buildUnresolved(x.track))
			);

			return this.buildResponse('PLAYLIST_LOADED', unresolvedPlaylistTracks, playlist.name);
		} catch (e) {
			return this.buildResponse(
				e.status === 404 ? 'NO_MATCHES' : 'LOAD_FAILED',
				[],
				undefined,
				e.body?.error.message ?? e.message
			);
		}
	}

	/**
	 * Fetch an album from Spotify.
	 * @param {string} id
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async fetchAlbum(id) {
		try {
			const album = await this.requestData(`/albums/${id}`);

			const limitedTracks = this.options.albumLimit
				? album.tracks.items.slice(0, this.options.albumLimit * 100)
				: album.tracks.items;

			const unresolvedPlaylistTracks = await Promise.all(
				limitedTracks.map(x => this.buildUnresolved(x))
			);
			return this.buildResponse('PLAYLIST_LOADED', unresolvedPlaylistTracks, album.name);
		} catch (e) {
			return this.buildResponse(
				e.body?.error.message === 'invalid id' ? 'NO_MATCHES' : 'LOAD_FAILED',
				[],
				undefined,
				e.body?.error.message ?? e.message
			);
		}
	}

	/**
	 * Fetch an artist top tracks from Spotify.
	 * @param {string} id
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async fetchArtist(id) {
		try {
			const artist = await this.requestData(`/artists/${id}`);

			const data = await this.requestData(
				`/artists/${id}/top-tracks?market=${this.searchMarket ?? 'US'}`
			);

			const limitedTracks = this.options.artistLimit
				? data.tracks.slice(0, this.options.artistLimit * 100)
				: data.tracks;

			const unresolvedPlaylistTracks = await Promise.all(
				limitedTracks.map(x => this.buildUnresolved(x))
			);

			return this.buildResponse('PLAYLIST_LOADED', unresolvedPlaylistTracks, artist.name);
		} catch (e) {
			return this.buildResponse(
				e.body?.error.message === 'invalid id' ? 'NO_MATCHES' : 'LOAD_FAILED',
				[],
				undefined,
				e.body?.error.message ?? e.message
			);
		}
	}

	/**
	 * Fetch a track from Spotify.
	 * @param {string} id
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async fetchTrack(id) {
		try {
			const data = await this.requestData(`/tracks/${id}`);
			const unresolvedTrack = await this.buildUnresolved(data);

			return this.buildResponse('TRACK_LOADED', [unresolvedTrack]);
		} catch (e) {
			return this.buildResponse(
				e.body?.error.message === 'invalid id' ? 'NO_MATCHES' : 'LOAD_FAILED',
				[],
				undefined,
				e.body?.error.message ?? e.message
			);
		}
	}

	/**
	 * Search in Spotify.
	 * @param {string} query
	 * @returns {shoukaku.LavalinkResponse}
	 */
	async search(query) {
		try {
			const data = await this.requestData(
				`/search/?q="${query}"&type=artist,album,track&market=${this.options.searchMarket ?? 'US'}`
			);
			const unresolvedTracks = await Promise.all(
				data.tracks.items.map(x => this.buildUnresolved(x))
			);
			return this.buildResponse('TRACK_LOADED', unresolvedTracks);
		} catch (e) {
			return this.buildResponse(
				e.body?.error.message === 'invalid id' ? 'NO_MATCHES' : 'LOAD_FAILED',
				[],
				undefined,
				e.body?.error.message ?? e.message
			);
		}
	}

	/**
	 * Fetch a playlist tracks from Spotify.
	 * @param {unknown} spotifyPlaylist
	 * @returns {Promise<void>}
	 */
	async fetchPlaylistTracks(spotifyPlaylist) {
		let nextPage = spotifyPlaylist.tracks.next;
		let pageLoaded = 1;
		while (nextPage) {
			if (!nextPage) break;
			const req = await fetch(nextPage, {
				headers: { Authorization: this.token }
			});
			const body = await req.json();
			if (body.error) break;
			spotifyPlaylist.tracks.items.push(...body.items);

			nextPage = body.next;
			pageLoaded++;
		}
	}

	/**
	 * Create a Lavalink response.
	 * @param {Record<string, unknown>} track
	 * @returns {Promise<shoukaku.LavalinkResponse>}
	 */
	async buildUnresolved(track) {
		if (!track) throw new ReferenceError('The Spotify track object was not provided');

		return new Object({
			track: '',
			info: {
				identifier: track.id,
				isSeekable: true,
				author: track.artists[0]?.name,
				length: track.duration_ms,
				isStream: false,
				position: 0,
				sourceName: 'spotify',
				title: track.name,
				uri: `https://open.spotify.com/track/${track.id}`,
				thumbnail: track.album?.images[0]?.url,
			}
		});
	}

	/**
	 * Fetch metadata from Spotify.
	 * @param {shoukaku.Track} track
	 * @returns {Promise<shoukaku.Track>}
	 */
	async fetchMetaData(track) {
		const fetch = await this.manager.search(`${track.info.title} ${track.info.author}`);
		return fetch.tracks[0];
	}

	/**
	 * Build a Lavalink track.
	 * @param {Record<string, unknown>} unresolvedTrack
	 * @returns {shoukaku.Track}
	 */
	async buildTrack(unresolvedTrack) {
		const lavaTrack = await this.fetchMetaData(unresolvedTrack);
		if (lavaTrack) {
			unresolvedTrack.track = lavaTrack.track;
			unresolvedTrack.info.identifier = lavaTrack.info.identifier;
			return unresolvedTrack;
		}
	}

	/**
	 * Check if value is not null or undefined.
	 * @param {unknown} value
	 * @returns {boolean}
	 */
	compareValue(value) {
		return typeof value !== 'undefined' ? value !== null : typeof value !== 'undefined';
	}

	/**
	 * Build a Lavalink response.
	 * @param {shoukaku.LoadType} loadType
	 * @param {shoukaku.Track[]} tracks
	 * @param {string} [playlistName]
	 * @param {string} [exceptionMsg]
	 * @returns {shoukaku.LavalinkResponse}
	 */
	buildResponse(loadType, tracks, playlistName, exceptionMsg) {
		return Object.assign(
			{
				loadType,
				tracks,
				playlistInfo: playlistName ? { name: playlistName } : {}
			},
			exceptionMsg ? { exception: { message: exceptionMsg, severity: 'COMMON' } } : {}
		);
	}
}

module.exports = Spotify;
