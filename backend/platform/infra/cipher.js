const crypto = require('crypto');

const secretKey = $Config.get("cipher", "secret_key");
const secretIV = $Config.get("cipher", "secret_iv");
const encMethod = $Config.get("cipher", "enc_method");

const staticKey = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0, 32);
const staticEncIv = crypto.createHash('sha512').update(secretIV).digest('hex').substring(0, 16);

module.exports =
{
    encryptData: function(data, iv = null)
    {
        if (iv !== null)
        {
            if (iv === "static")
            {
                iv = staticEncIv;
            }

            // Legacy mode: use provided IV (for backward compatibility with existing code) AND for tokens
            iv = iv.substring(0, 16);
            const cipher = crypto.createCipheriv(encMethod, staticKey, iv);
            const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
            return Buffer.from(encrypted).toString('base64');
        }
        else
        {
            // New secure mode: generate random IV and prepend to ciphertext
            const randomIv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(encMethod, staticKey, randomIv);
            const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
            
            // Prepend IV to ciphertext (IV doesn't need to be secret)
            const ivHex = randomIv.toString('hex');
            const combined = ivHex + encrypted;
            
            return Buffer.from(combined).toString('base64');
        }
    },

    decryptData: function(data, iv = null)
    {
        let text = "";

        try
        {
            const buff = Buffer.from(data, 'base64');
            const combined = buff.toString('utf-8');
            
            if (iv !== null)
            {
                if (iv === "static")
                {
                    iv = staticEncIv;
                }

                // Legacy mode: use provided IV (for backward compatibility with existing code) AND for tokens
                iv = iv.substring(0, 16);
                const decipher = crypto.createDecipheriv(encMethod, staticKey, iv);
                text = decipher.update(combined, 'hex', 'utf8') + decipher.final('utf8');
            }
            else
            {
                // Auto-detect format: new format has IV prepended (32 hex chars = 16 bytes)
                // Try new format first (random IV prepended)
                if (combined.length >= 32)
                {
                    try
                    {
                        const ivHex = combined.substring(0, 32);
                        const encryptedHex = combined.substring(32);
                        const extractedIv = Buffer.from(ivHex, 'hex');
                        
                        const decipher = crypto.createDecipheriv(encMethod, staticKey, extractedIv);
                        text = decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
                        return text;
                    }
                    catch (e)
                    {
                        // Fall through to legacy format
                    }
                }
                
                // Legacy format: use static IV (for old encrypted data)
                const decipher = crypto.createDecipheriv(encMethod, staticKey, staticEncIv);
                text = decipher.update(combined, 'hex', 'utf8') + decipher.final('utf8');
            }
        }
        catch (error)
        {
            text = "";
        }

        return text;
    }    
}
