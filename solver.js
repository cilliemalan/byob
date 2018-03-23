const { decode, encode } = require('./utils');
const { fork } = require('child_process');
const { resolve: resolvePath } = require('path');

const node = process.argv0;
const worker = resolvePath(__dirname, 'solver.worker.js');
let running_process = fork(worker);

const updateProblem = (hash, target) => {

    return new Promise((resolve, reject) => {

        const onmessage = m => {
            const bhash = decode(m.hash);
            const bcomp = decode(m.compliment);
            const btarget = decode(m.target);

            if (bhash.equals(hash) && btarget.equals(target)) {
                resolve(bcomp);
            }
        }

        running_process.once('message', onmessage);
        running_process.send({ hash: encode(hash), target: encode(target) });
    });
}


/**
 * Finds a compliment such that hash ^ compliment < target. Note: if this is called while
 * a previous problem is still in the process of being solved, that problem solving
 * process will be cancelled and the previously returned promise will never resolve.
 * @param {Buffer} hash The hash part of the problem
 * @param {Buffer} target The target under which the solution should be
 * @returns {Promise<Buffer>} the solution to the problem
 */
const solve = (hash, target) => {
    if (typeof hash == "string") hash = decode(hash);
    if (typeof target == "string") target = decode(target);

    return updateProblem(hash, target);
}

module.exports = {
    solve
}