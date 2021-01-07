/*eslint no-console: 0 */
const Promise = require('bluebird');
const fs = require('fs');
const {go, Channel, CLOSED} = require('ts-csp');
const {pipeFromStream} = require('@dawadk/common/src/csp-util');
const split2 = require('split2');
const moment = require('moment');
const http = require('http');
const host = process.argv[2];
const file = process.argv[3];

const ch = new Channel();

const stream = fs.createReadStream(file, {encoding: 'ascii'}).pipe(split2());

pipeFromStream(stream, ch, 8096);

const regex = /^([^\t]+)\t([^\t]+)\t(?:[^\t]+\t){2}([^\t]+)\t(?:[^\t]+\t){2}([^\t]*)\t(?:[^\t]+\t){3}([^\t]+)\t(?:[^\t]+)\t([^\t]+)/;
const requestPlan = [];

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
go(function* () {
    console.log('preparing...');
    while (true) {
        const value = yield ch.take();
        if (value === CLOSED) {
            break;
        }
        const match = regex.exec(value);
        if(match[6] === 'Miss') {
            requestPlan.push({
                cip: match[3],
                time: moment(`${match[1]}T${match[2]}Z`).add(getRandomInt(1000)),
                url: match[4] + (match[5] !== '-' ? ('?' + match[5]) : '')
            });
        }
    }
    let now = moment();
    requestPlan.sort((a, b) => a.time.diff(b.time));
    const firstRequestTime = moment(requestPlan[0].time);
    const offset = now.diff(firstRequestTime) + 10000;
    requestPlan.forEach(req => req.time = req.time.add(offset));
    let successes = 0;
    let errors = 0;
    let rejections = 0;
    let badRequests = 0;
    let notFounds = 0;
    let serverErrors = 0;
    let clientErrors = 0;
    console.log('starting');
    const requestsToMake = requestPlan.length;
    const agent = new http.Agent({
        keepAlive: true,
        maxSockets: 1000,
    });
    for (let index = 0; index < requestsToMake; ++index) {
        if(index % 1000 === 0) {
            console.log('successes', successes, 'errors', errors, 'rejections', rejections, 'badRequests', badRequests, 'notFounds', notFounds, 'serverErrors', serverErrors, 'clientErrors', clientErrors);
        }
        now = moment();
        const url = requestPlan[index].url;
        while (now.isBefore(requestPlan[index].time)) {
            const millisToWait = requestPlan[index].time.diff(now);
            yield Promise.delay(millisToWait);
            now = moment();
        }
        const options = {
            headers: {'X-Forwarded-For': requestPlan[index].cip},
            agent
        };
        const request = http.get(`${host}${url}`, options, response => {
            if (response.statusCode === 429) {
                ++rejections;
            }
            else if (response.statusCode === 400) {
                ++badRequests;
            }
            else if (response.statusCode === 404) {
                ++notFounds;
            }
            else if (response.statusCode === 500) {
                ++serverErrors;
            }
            else if (response.statusCode === 200 || response.statusCode === 302) {
                response.on('data', () => null);
                response.on('end', () => {
                    ++successes;
                });
                response.on('error', () => {
                    ++errors;
                });
            }
            else {
                console.log('unusual response code', response.statusCode);
                ++errors;
            }
        });
        request.on('error', () => ++clientErrors);
    }
    console.log('successes', successes, 'errors', errors, 'rejections', rejections, 'badRequests', badRequests, 'notFounds', notFounds, 'serverErrors', serverErrors, 'clientErrors', clientErrors);
}).asPromise().then(() => {
    console.log('complete')
}, error => console.log('error', error));


