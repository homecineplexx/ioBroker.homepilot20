'use strict';

const { expect } = require('chai');
const getAggregateConnectionStatus = require('../lib/connection-status');
const { parseBoostTime } = require('../lib/values');
const createSaltedPassword = require('../lib/authentication');

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

    it('counts failed request sources', () => {
        const status = new Map([
            ['actuators', true],
            ['sensors', false],
            ['transmitters', true]
        ]);

        expect(getAggregateConnectionStatus.countFailedSources(status)).to.equal(2);
    });
});

describe('HomePilot value conversion', () => {
    it('converts BOOST_TIME_CFG strings to numbers', () => {
        expect(parseBoostTime('15')).to.equal(15);
        expect(parseBoostTime('4.5')).to.equal(4.5);
    });

    it('rejects invalid BOOST_TIME_CFG values', () => {
        expect(parseBoostTime(undefined)).to.equal(null);
        expect(parseBoostTime('')).to.equal(null);
        expect(parseBoostTime('not-a-number')).to.equal(null);
    });
});

describe('HomePilot authentication', () => {
    it('creates the password hash required by the HomePilot API', () => {
        expect(createSaltedPassword('test-password', 'test-salt')).to.equal(
            'd835ac95ac95a396ef5c406e253915e57d2ee0f84d85b0b35c2dc55ec952784b'
        );
    });
});
