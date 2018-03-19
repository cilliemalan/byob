const { ok, equal, notEqual, deepEqual } = require('assert');

const { encode, decode, hash, sign_hash, sign,
    verify_sig, verify,
    generate_key, get_public_key_from_private_key } = require('../utils');

const {
    is_valid_base64,
    is_valid_public_key,
    is_valid_private_key,
    is_valid_hash } = require('../validation');


module.exports = {
    'is_valid_base64 valid for valid base64': () => ok(is_valid_base64('blahdiblah')),
    'is_valid_base64 not valid for invalid base64': () => ok(!is_valid_base64('%(*^$^')),
    'is_valid_public_key valid': () => ok(is_valid_public_key('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid length != 44': () => ok(!is_valid_public_key('A')),
    'is_valid_public_key not valid not starts with A': () => ok(!is_valid_public_key('BmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key not valid not base64': () => ok(!is_valid_public_key('BmidWK#6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb')),
    'is_valid_public_key valid buffer': () => ok(is_valid_public_key(Buffer.from('AmidWK-6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),
    'is_valid_public_key not valid length wrong': () => ok(!is_valid_public_key(Buffer.from('AmidWK6LWDvH0ljhWZ7_Qzw3533OkUs_Uz9_IQjocbb', 'base64'))),

    'is_valid_private_key valid': () => ok(is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_private_key not valid for invalid base64': () => ok(!is_valid_private_key('2o#57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s')),
    'is_valid_private_key not valid for bad length': () => ok(!is_valid_private_key('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjo')),
    'is_valid_private_key valid for buffer': () => ok(is_valid_private_key(Buffer.from('2o_57mhaLjzkp4Pnr0xk_JCb7-Ehs3NzN73gjohOr2s', 'base64'))),
}
