const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync('tu_password_seguro_123', 'salt', 32);
const iv = crypto.randomBytes(16);

const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    const [ivPart, encryptedPart] = text.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivPart, 'hex'));
    let decrypted = decipher.update(encryptedPart, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = { encrypt, decrypt };