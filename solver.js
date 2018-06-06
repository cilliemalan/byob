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

        const sdata = data.toString().split(/\r?\n/);

        sdata.forEach(line => {
            let msg;
            if (line && line.trim()) {
                try {
                    msg = JSON.parse(line);
                } catch (e) {
                    console.log(line);
                }

                if (msg) {
                    messages.emit('message', msg);
                }
            }
        });

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

const update_problem = (hash, target) => {
    if (typeof hash !== "string") hash = encode(hash);
    if (typeof target !== "string") target = encode(target);
    send_message({ hash, target });
}

const new_problem = (hash, target) => {
    if (!running_process) {
        start_worker();
    }

    return new Promise((resolve, reject) => {

        const onmessage = m => {
            const bhash = decode(m.hash);
            const bcomp = decode(m.compliment);
            const btarget = decode(m.target);

            if (bhash && bcomp && btarget) {
                remove_onmessage();
                resolve({ hash: bhash, compliment: bcomp, target: btarget });
            }
        }

        const remove_onmessage = () => {
            messages.removeListener('message', onmessage);
        }

        messages.on('message', onmessage);
        update_problem(hash, target);
    });
}

/**
 * Finds a compliment such that hash ^ compliment < target. Note: if this is called while
 * a previous problem is still in the process of being solved, that problem solving
 * process will NOT be cancelled and the previously returned promise will resolve when
 * THIS problem finishes, but returning null instead of the compliment.
 * @param {Buffer} hash The hash part of the problem
 * @param {Buffer} target The target under which the solution should be. Defaults to the
 * target set in configuration.
 * @returns {Promise<Buffer>} the solution to the problem, or null if the hash has been updated.
 */
const solve = async (hash, target = TARGET) => {
    if (typeof hash == "string") hash = decode(hash);
    if (typeof target == "string") target = decode(target);

    const result = await new_problem(hash, target);
    if(result.hash.equals(hash) && result.target.equals(target)) {
        return result.compliment;
    } else {
        return null;
    }
}

/**
 * Updates the hash of the currently running problem. The promise returned by
 * the previous call to solve will only resolve after THIS hash's compliment is
 * found.
 * @param {string|Buffer} new_hash the new hash to find a compliment for
 */
const update_hash = (new_hash) => {
    update_problem(new_hash);
}

module.exports = {
    solve
}