'use strict';

/**
 * A HomePilot refresh consists of multiple independent API requests. The
 * station is only considered reachable when none of the latest request
 * results reports an error.
 *
 * @param {Map<string, boolean>} statusBySource
 * @returns {boolean}
 */
function getAggregateConnectionStatus(statusBySource) {
    return Array.from(statusBySource.values()).some(Boolean);
}

module.exports = getAggregateConnectionStatus;
