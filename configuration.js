const { resolve } = require('path');

module.exports = {
    BLOCK_REWARD: parseFloat(process.env.BYOB_BLOCK_REWARD || 1),
    TARGET: process.env.BYOB_TARGET || 'AAABrX8pq8r0hXh6ZSDsCNI2mRlBGaXDc4e3GQZhQxA',
    KEYS_FILE: resolve(process.env.BYOB_KEYS_FILE ||
        resolve(process.env.USERPROFILE || process.env.HOME, '.byobkeys.json')),
    DB_FILE: resolve(process.env.BYOB_DB_FILE ||
        resolve(process.cwd(), 'db.json'))
};