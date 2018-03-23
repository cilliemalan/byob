const { encode, decode } = require('./utils');
const { buffer_less_than } = require('./validation');
const { randomBytes, createHash } = require('crypto');

// initialize blank
let bhash = null;
let btarget = null;

process.on('message', m => {
    if (m) {
        if (m.hash) bhash = decode(m.hash);
        if (m.target) btarget = decode(m.target);
    }
});

// does buffer1 ^ buffer2
const xor_buffers = (a, b) => {

    const c = new Buffer(32);
    for (let i = 0; i < 32; ++i) {
        c[i] = a[i] ^ b[i];
    }

    return c;
}

// gets time now in seconds, but like in high resolution.
const gethrnow = () => {
    const tm = process.hrtime();
    return tm[0] + tm[1] / 1000000000;
}

// some stuffs
const REPORT_FREQ = 100000;
let hashes_done = 0;
let hrt = gethrnow();
let hrs = gethrnow();

// main mining function
const mine = (iterations = 10000) => {
    if (!bhash || !btarget) {
        console.log('waiting for problem...');
        setTimeout(mine, 100);
    } else {

        for (; iterations; --iterations, ++hashes_done) {
            const compliment = randomBytes(32);
            const complemented = xor_buffers(compliment, bhash);
            const digest = createHash('sha256').update(complemented).digest();

            if (buffer_less_than(digest, btarget)) {
                console.log(`Found solution after ${parseInt(hashes_done / 10000) / 100} million hashes taking ${parseInt(gethrnow() - hrs)} seconds`);
                // console.log(`Compliment:    ${encode(compliment)}`);
                // console.log(`Hash:          ${encode(bhash)}`);
                // console.log(`Target:        ${encode(btarget)}`);
                // console.log(`Hased compl:   ${encode(digest)}`);

                if (process.send) process.send({ target: encode(btarget), hash: encode(bhash), compliment: encode(compliment) });

                //reset
                bhash = null;
                break;
            }

            // print a status report
            if (hashes_done && (hashes_done % REPORT_FREQ == 0)) {
                const hrnow = gethrnow();
                const diff = hrnow - hrt;
                const s = REPORT_FREQ / diff;
                hrt = hrnow;
                process.stdout.write(`hashrate: ${parseInt(s / 100) / 10} KH/s      \r`);
            }
        }

        setImmediate(mine);
    }
}


// here we go!
setImmediate(mine);