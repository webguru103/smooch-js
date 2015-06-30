'use strict';

var sinon = require('sinon'),
    cookie = require('cookie');

var ClientScenario = require('../scenarios/clientScenario'),
    endpoint = require('../../src/js/endpoint');

var SK_STORAGE = 'sk_deviceid';

describe('Main', function() {
    var scenario,
        sandbox,
        SupportKit;

    before(function() {
        scenario = new ClientScenario();
        scenario.build();
    });

    after(function() {
        scenario.clean();
    });

    beforeEach(function(done) {
        sandbox = sinon.sandbox.create();
        SupportKit = require('../../src/js/main.js');
        SupportKit.once('ready', done);
        SupportKit.init({
            appToken: 'thisisanapptoken'
        });
    });

    afterEach(function() {
        SupportKit.destroy();
        delete global.SupportKit;
        sandbox.restore();
    });

    describe('Global bindings', function() {
        // those tests are using the expect form since undefined
        // cannot be tested with the should syntax
        it('should publish a global', function() {
            global.SupportKit.should.exist;
        });

        it('should not publish dependencies in global context', function() {
            expect(global.Backbone).to.not.exist;
            expect(global._).to.not.exist;
        });
    });

    describe('#init', function() {
        var userId = 'thisisauserid',
            appToken = 'thisisanapptoken',
            jwt = 'thisisajwt',
            trackSpy;

        beforeEach(function() {
            trackSpy = sandbox.spy(SupportKit, 'track');
        });

        it('should trigger ready and track appboot', function(done) {
            SupportKit.destroy();

            SupportKit.once('ready', function() {
                trackSpy.should.have.been.calledWith('skt-appboot');
                done();
            });

            SupportKit.init({
                appToken: appToken
            });
        });

        it('if supplied a userId should store the deviceId in local storgae', function(done) {
            SupportKit.destroy();

            SupportKit.once('ready', function() {
                localStorage.getItem(SK_STORAGE + '_' + userId).should.exist;
                done();
            });

            SupportKit.init({
                appToken: appToken,
                userId: userId
            });
        });

        it('should populate endpoint with supplied appToken and jwt', function(done) {
            SupportKit.destroy();

            SupportKit.once('ready', function() {
                endpoint.jwt.should.eql(jwt);
                endpoint.appToken.should.eql(appToken);
                done();
            });

            SupportKit.init({
                appToken: appToken,
                jwt: jwt
            });
        });
    });

    describe('#logout', function() {
        beforeEach(function() {
            document.cookie = SK_STORAGE + '=' + 'test';
            SupportKit.logout();
        });

        it('should remove the device id from cookies', function() {
            expect(cookie.parse(document.cookie)[SK_STORAGE]).to.not.exist;
        });
    });

    describe('#updateUser', function() {
        beforeEach(function() {
            sandbox.stub(SupportKit, '_updateUser');
            SupportKit._throttledUpdate = SupportKit._updateUser;

            SupportKit.user.set({
                givenName: 'test',
                surname: 'user'
            }, {
                silent: true
            });

            SupportKit.updateUser({
                givenName: 'GIVEN_NAME',
                surname: 'SURNAME',
                properties: {
                    'TEST': true
                }
            });
        });

        it('should call _updateUser', function() {
            SupportKit._updateUser.should.be.calledOnce;
        });

        it('should throw an error if called with bad parameters (empty, in this case)', function() {
            SupportKit.updateUser.should.throw(Error);
        });

        it('should not call update user if the user has not changed', function() {
            SupportKit._updateUser.should.be.calledOnce;

            SupportKit.updateUser({
                givenName: 'GIVEN_NAME',
                surname: 'SURNAME',
                properties: {
                    'TEST': true
                }
            });

            SupportKit._updateUser.should.be.calledOnce;
        });
    });

    describe('#_rulesContainEvent', function() {
        it('should contain "in-rule" event', function() {
            SupportKit._rulesContainEvent('in-rule-in-event').should.be.true;
            SupportKit._rulesContainEvent('in-rule-not-event').should.be.true;
        });

        it('should not contain "not-in-rule" event', function() {
            SupportKit._rulesContainEvent('not-rule-in-event').should.be.false;
        });
    });

    describe('#_hasEvent', function() {
        it('should contain "in-rule" and "not-in-rule" events', function() {
            SupportKit._hasEvent('in-rule-in-event').should.be.true;
            SupportKit._hasEvent('not-rule-in-event').should.be.true;
        });

        it('should not contain "not-in-event" event', function() {
            SupportKit._hasEvent('in-rule-not-event').should.be.false;
        });
    });

    describe('#track', function() {
        var endpoint = require('../../src/js/endpoint');
        var eventCreateSpy,
            endpointSpy;

        beforeEach(function() {
            eventCreateSpy = sandbox.spy(SupportKit._eventCollection, 'create');
            endpointSpy = sandbox.spy(endpoint, 'put');
        });

        describe('tracking a new event', function() {

            it('should call /api/event', function() {
                SupportKit._hasEvent('new-event').should.be.false;
                SupportKit._rulesContainEvent('new-event').should.be.false;

                SupportKit.track('new-event');

                endpointSpy.should.have.been.calledWith('api/event');
            });
        });

        describe('tracking an existing event in rules', function() {

            it('should create an event through the collection', function() {
                SupportKit._rulesContainEvent('in-rule-not-event').should.be.true;
                SupportKit._hasEvent('in-rule-not-event').should.be.false;

                SupportKit.track('in-rule-not-event');


                SupportKit._rulesContainEvent('in-rule-in-event').should.be.true;
                SupportKit._hasEvent('in-rule-in-event').should.be.true;

                SupportKit.track('in-rule-in-event');

                eventCreateSpy.should.have.been.calledTwice;
            });
        });

        describe('tracking an existing event not in rules', function() {
            it('should do nothing if already in events and not in rules', function() {
                SupportKit._rulesContainEvent('not-rule-in-event').should.be.false;
                SupportKit._hasEvent('not-rule-in-event').should.be.true;

                SupportKit.track('not-rule-in-event');

                eventCreateSpy.should.not.have.been.called;
                endpointSpy.should.not.have.been.called;
            });
        });


        describe('skt-appboot', function() {

            it('should do nothing if not in rules', function() {
                SupportKit._rulesContainEvent('skt-appboot').should.be.false;
                SupportKit._hasEvent('skt-appboot').should.be.true;

                SupportKit.track('skt-appboot');

                eventCreateSpy.should.not.have.been.called;
                endpointSpy.should.not.have.been.called;
            });


            describe('in rules', function() {
                beforeEach(function() {
                    SupportKit._ruleCollection.add({
                        '_id': '558c455fa2d213d0581f0a0b',
                        'events': ['skt-appboot']
                    }, {
                        parse: true
                    });
                });

                it('should create an event through the collection', function() {
                    SupportKit._rulesContainEvent('skt-appboot').should.be.true;
                    SupportKit._hasEvent('skt-appboot').should.be.true;

                    SupportKit.track('skt-appboot');

                    eventCreateSpy.should.have.been.calledOnce;
                });
            });
        });
    });
});
