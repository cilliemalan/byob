/**
 * Base64 encodes something.
 * @param {string|Buffer} stuff 
 */
const encode = (stuff) => {
    let base64;
    if (stuff instanceof Buffer) base64 = stuff.toString('base64');
    else if (typeof stuff == 'string') base64 = Buffer.from(stuff).toString('base64');
    else throw "can only encode strings and buffers";

    return base64.replace(/={1,2}$/, '');
}

/**
 * Base64 decodes something.
 * @param {string} encoded 
 */
const decode = (encoded) => Buffer.from(encoded, 'base64');
