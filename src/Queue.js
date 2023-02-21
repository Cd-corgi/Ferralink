const shoukaku = require('shoukaku');

/**
 * @extends Array<shoukaku.Track>
 */
class Queue extends Array {
	/**
	 * Get the queue size
	 * @returns {number}
	 */
	get size() {
		return this.length;
	}

	/**
	 * Get the queue total size (plus the current track)
	 * @returns {number}
	 */
	get totalSize() {
		return this.length + (this.current ? 1 : 0);
	}

	/** @type {shoukaku.Track|null|undefined} */
	current = null;

	/** @type {shoukaku.Track|null|undefined} */
	previous = null;

	/**
	 * Check if the queue is empty
	 * @returns {boolean}
	 */
	get isEmpty() {
		return this.length === 0;
	}

	/**
	 * Get the queue duration
	 * @returns {number}
	 */
	get durationLength() {
		return this.reduce((acc, cur) => acc + (cur.length || 0), 0);
	}

	/**
	 * Add a track to the queue
	 * @param {shoukaku.Track} track
	 * @returns {Queue}
	 */
	add(track, options) {
		track.info.requester = options?.requester || null;
		this.push(track);
		return this;
	}

	/**
	 * Remove a track from the queue
	 * @param {number} index
	 * @returns {Queue}
	 */
	remove(index) {
		return this.splice(index, 1)[0];
	}

	/**
	 * Clear the queue
	 * @returns {Queue}
	 */
	clear() {
		return this.splice(0);
	}

	/**
	 * Randomize the queue
	 * @returns {void}
	 */
	shuffle() {
		for (let i = this.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[this[i], this[j]] = [this[j], this[i]];
		}
	}
}

module.exports = Queue;
