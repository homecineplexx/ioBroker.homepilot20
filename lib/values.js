'use strict';

/**
 * HomePilot reports capability values as strings, even when ioBroker exposes
 * them as numeric states.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
function parseBoostTime(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { parseBoostTime };
