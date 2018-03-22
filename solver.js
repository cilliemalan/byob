const { decode, encode } = require('./utils');
const { fork } = require('child_process');
const { resolve: resolvePath } = require('path');

const node = process.argv0;
const worker = resolvePath(__dirname, 'solver.worker.js');
let running_process;

const runSolver = (hash, target) => {
    if (running_process) {
        running_process.kill('SIGINT');
        running_process = null;
    }

    return new Promise((resolve, reject) => {
        let solution;
        running_process = fork(worker, [encode(hash), encode(target)]);

        running_process.on('message', m => {
            console.log(`MESSAGEMESSAGE`, m)
            solution = m && m.compliment;
        });

        running_process.on('close', (code, sig) => {
            if (code == 0) {
                if (!solution) {
                    reject('Child process exited without providing a solution');
                } else {
                    resolve(solution);
                }
            } else {
                reject(`The child process exited with code ${code}`);
            }
        })
    });
}


/**
 * Finds a compliment such that hash ^ compliment < target. Note: if this is called while
 * a previous problem is still in the process of being solved, that problem solving
 * process will be cancelled and the previously returned promise will reject.
 * @param {Buffer} hash The hash part of the problem
 * @param {Buffer} target The target under which the solution should be
 * @returns {Promise<Buffer>} the solution to the problem
 */
const solve = (hash, target) => {
    if (typeof hash == "string") hash = decode(hash);
    if (typeof target == "string") target = decode(target);

    return runSolver(hash, target);
}

module.exports = {
    solve
}