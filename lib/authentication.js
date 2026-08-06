'use strict';

const { createHash } = require('node:crypto');

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

/**
 * Create the two-stage SHA-256 password expected by the HomePilot API.
 *
 * @param {string} password
 * @param {string} salt
 * @returns {string}
 */
function createSaltedPassword(password, salt) {
    return sha256(salt + sha256(password));
}

module.exports = createSaltedPassword;
