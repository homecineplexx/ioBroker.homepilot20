'use strict';

const { expect } = require('chai');
const httpRequest = require('../lib/http-client');

describe('HTTP client', () => {
    it('normalizes the adapter header array and returns response data', async () => {
        let received;
        const fakeFetch = async (url, options) => {
            received = { url, options };
            return {
                status: 200,
                headers: {
                    getSetCookie: () => ['session=test'],
                    get: () => null
                },
                text: async () => '{"ok":true}'
            };
        };

        const result = await httpRequest({
            method: 'GET',
            uri: 'http://homepilot.test/devices',
            headers: [{ Cookie: 'session=test' }, { Accept: 'application/json' }]
        }, 10000, fakeFetch);

        expect(received.url).to.equal('http://homepilot.test/devices');
        expect(received.options.headers).to.deep.equal({ Cookie: 'session=test', Accept: 'application/json' });
        expect(received.options.signal).to.be.instanceOf(AbortSignal);
        expect(result).to.deep.equal({
            response: { statusCode: 200, headers: { 'set-cookie': ['session=test'] } },
            body: '{"ok":true}'
        });
    });
});
