const { decode, encode } = require('./utils');
const { spawn } = require('child_process');
const { resolve: resolvePath } = require('path');
const EventEmitter = require('events');

const { TARGET } = require('./configuration');

const node = process.argv0;
const worker = resolvePath(__dirname, 'solver.worker.js');
let running_process;
const messages = new EventEmitter();
let send_message;

const start_worker = () => {
    if (running_process && !running_process.killed) {
        running_process.kill();
    }
    running_process = null;

    running_process = spawn(node, [worker, '-q'], {
        stdio: ['pipe', 'pipe', process.stderr]
    });

    running_process.stdout.on('data', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) { }

        if (msg) {
            messages.emit('message', msg);
        }
    });

    running_process.on('exit', () => {
        running_process = null;
    });

    process.once('exit', () => {
        if (running_process && !running_process.killed) {
            running_process.kill();
            running_process = null;
        }
    });

    send_message = (msg) => {
        running_process.stdin.write(JSON.stringify(msg));
        running_process.stdin.write('\n');
    }
}


const updateProblem = (hash, target) => {
    if (!running_process) {
        start_worker();
    }

    return new Promise((resolve, reject) => {

        const onmessage = m => {
            const bhash = decode(m.hash);
            const bcomp = decode(m.compliment);
            const btarget = decode(m.target);

            if (bhash.equals(hash) && btarget.equals(target)) {
                resolve(bcomp);
                remove_onmessage();
            }
        }

        const remove_onmessage = () => {
            messages.removeListener('message', onmessage);
        }

        messages.on('message', onmessage);
        send_message({ hash: encode(hash), target: encode(target) });
    });
}


/**
 * Finds a compliment such that hash ^ compliment < target. Note: if this is called while
 * a previous problem is still in the process of being solved, that problem solving
 * process will be cancelled and the previously returned promise will never resolve.
 * @param {Buffer} hash The hash part of the problem
 * @param {Buffer} target The target under which the solution should be. Defaults to the
 * target set in configuration.
 * @returns {Promise<Buffer>} the solution to the problem
 */
const solve = (hash, target = TARGET) => {
    if (typeof hash == "string") hash = decode(hash);
    if (typeof target == "string") target = decode(target);

    return updateProblem(hash, target);
}

module.exports = {
    solve
}