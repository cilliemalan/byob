const { encode, decode } = require('./utils');
const { buffer_less_than } = require('./validation');
const { randomBytes, createHash } = require('crypto');

// some validation
const shash = process.argv[2];
const starget = process.argv[3];

if (!shash) {
    console.error('no hash was provided');
    process.exit(5);
}
if (!starget) {
    console.error('no target was provided');
    process.exit(6);
}

const bhash = decode(shash);
const btarget = decode(starget);

if (bhash.length != 32) {
    console.error(`the hash was not valid. Needs to be 32 bytes long. was ${bhash.length} bytes long.`);
    process.exit(7);
}
if (btarget.length != 32) {
    console.error(`the target was not valid. Needs to be 32 bytes long. was ${btarget.length} bytes long.`);
    process.exit(8);
}


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

// here we go!
console.log(`mining...\n`)
for (; ; ++hashes_done) {
    const compliment = randomBytes(32);
    const complemented = xor_buffers(compliment, bhash);
    const digest = createHash('sha256').update(complemented).digest();

    if (buffer_less_than(digest, btarget)) {
        console.log(`Found solution after ${parseInt(hashes_done / 10000) / 100} million hashes taking ${parseInt(gethrnow() - hrs)} seconds`);
        console.log(`Compliment:    ${encode(compliment)}`);
        console.log(`Hash:          ${encode(bhash)}`);
        console.log(`Target:        ${encode(btarget)}`);
        console.log(`Hased compl:   ${encode(digest)}`);
        if (process.send) process.send({ compliment: encode(compliment) });
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
