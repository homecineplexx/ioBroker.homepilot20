'use strict';

function parsePollInterval(value, fallback, name) {
    if (value === undefined || value === null || String(value).trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }
    return parsed;
}

function buildHost(host, port) {
    const normalizedHost = host === undefined || host === null || String(host).trim() === ''
        ? 'homepilot.local'
        : String(host).trim();
    if (port === undefined || port === null || String(port).trim() === '') {
        return normalizedHost;
    }
    const normalizedPort = Number(port);
    if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
        throw new Error('HomePilot port must be an integer between 1 and 65535');
    }
    return `${normalizedHost}:${normalizedPort}`;
}

module.exports = { buildHost, parsePollInterval };
