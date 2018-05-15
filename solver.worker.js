const { encode, decode, xor_buffers, buffer_less_than } = require('./utils');
const { randomBytes, createHash } = require('crypto');

const { stdin, stdout } = process;

// initialize blank
let bhash = null;
let btarget = null;
let mining = false;

const silent = process.argv.includes('-q'),
    nop = () => { },
    log = silent ? nop : console.log,
    write = silent ? nop : stdout.write.bind(stdout),
    writeout = (b) => {
        stdout.write(JSON.stringify(b));
        stdout.write('\n');
    };

// gets time now in seconds but, like, in high resolution.
const gethrnow = () => {
    const tm = process.hrtime();
    return tm[0] + tm[1] / 1000000000;
}

// some stuffs
const REPORT_FREQ = 200000;
let hashes_done = 0;
let hrt;
let hrs;

// main mining function
const mine = (iterations = 10000) => {

    if (!mining) {
        hashes_done = 0;
        hrt = gethrnow();
        hrs = gethrnow();
        mining = true;
        log('mining...');
    }

    for (; iterations; --iterations, ++hashes_done) {
        const compliment = randomBytes(32);
        const complemented = xor_buffers(compliment, bhash);
        const digest = createHash('sha256').update(complemented).digest();

        if (buffer_less_than(digest, btarget)) {
            log(`Found solution after ${parseInt(hashes_done / 10000) / 100} million hashes taking ${parseInt(gethrnow() - hrs)} seconds`);
            log(`Compliment:    ${encode(compliment)}`);
            log(`Hash:          ${encode(bhash)}`);
            log(`Target:        ${encode(btarget)}`);
            log(`Hased compl:   ${encode(digest)}`);

            writeout({
                target: encode(btarget),
                hash: encode(bhash),
                compliment: encode(compliment)
            });

            // reset
            mining = false;
            bhash = null;
            log('Waiting for input');
            return;
        }

        // print a status report
        if (hashes_done && (hashes_done % REPORT_FREQ == 0)) {
            const hrnow = gethrnow();
            const diff = hrnow - hrt;
            const s = REPORT_FREQ / diff;
            hrt = hrnow;
            write(`\rhashrate: ${parseInt(s / 100) / 10} KH/s         `);
        }
    }

    setImmediate(mine);
}

// wait for input
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', (data) => {
    let m;
    try {
        m = JSON.parse(data)
    } catch (e) {
        log('could not parse input as json');
    }

    if (m) {
        if (m.hash) bhash = decode(m.hash);
        if (m.target) btarget = decode(m.target);
    }

    if (bhash && btarget && !mining) {
        setImmediate(mine);
    }
});

log('Waiting for input');
