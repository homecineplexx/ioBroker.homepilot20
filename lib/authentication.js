'use strict';

const CryptoJS = require('crypto-js');

/**
 * Create the two-stage SHA-256 password expected by the HomePilot API.
 *
 * @param {string} password
 * @param {string} salt
 * @returns {string}
 */
function createSaltedPassword(password, salt) {
    const passwordHash = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    return CryptoJS.SHA256(salt + passwordHash).toString(CryptoJS.enc.Hex);
}

module.exports = createSaltedPassword;
