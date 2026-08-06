'use strict';

function normalizeHeaders(headers) {
    if (!Array.isArray(headers)) {
        return headers || {};
    }
    return Object.assign({}, ...headers);
}

/**
 * Small compatibility wrapper for the request-style options used by the
 * adapter. It uses the Node.js fetch implementation and always applies a
 * request timeout.
 *
 * @param {string | {uri: string, method?: string, headers?: object | object[], body?: string}} options
 * @param {number} timeout
 * @param {typeof fetch} fetchImplementation
 */
async function request(options, timeout = 10000, fetchImplementation = fetch) {
    const requestOptions = typeof options === 'string' ? { uri: options } : options;
    const response = await fetchImplementation(requestOptions.uri, {
        method: requestOptions.method || 'GET',
        headers: normalizeHeaders(requestOptions.headers),
        body: requestOptions.body,
        signal: AbortSignal.timeout(timeout)
    });
    const body = await response.text();
    const setCookie = typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : response.headers.get('set-cookie');

    return {
        response: {
            statusCode: response.status,
            headers: { 'set-cookie': setCookie }
        },
        body
    };
}

module.exports = request;
module.exports.normalizeHeaders = normalizeHeaders;
