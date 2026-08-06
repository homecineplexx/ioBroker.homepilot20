'use strict';

const { expect } = require('chai');
const getAggregateConnectionStatus = require('../lib/connection-status');

describe('aggregated connection status', () => {
    it('reports reachable when all requests succeeded', () => {
        const status = new Map([
            ['actuators', false],
            ['sensors', false]
        ]);

        expect(getAggregateConnectionStatus(status)).to.equal(false);
    });

    it('keeps reporting unreachable when a later request succeeds', () => {
        const status = new Map([
            ['actuators', true],
            ['sensors', false]
        ]);

        expect(getAggregateConnectionStatus(status)).to.equal(true);
    });

    it('recovers after the failed request succeeds again', () => {
        const status = new Map([
            ['actuators', true],
            ['sensors', false]
        ]);

        status.set('actuators', false);

        expect(getAggregateConnectionStatus(status)).to.equal(false);
    });
});
