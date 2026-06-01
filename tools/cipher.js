const infraRoot = __dirname + "/../backend";
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

if (process.argv.length <= 3)
{
    console.log("\x1b[33m\x1b[1m%s\x1b[0m", "cipher <enc / dec / enc_static / dec_static> <data>");
    return;
}

isc.initStandAlone(infraRoot, "infra", null);

const action = process.argv[2];
const data = process.argv[3];

if (![ "enc", "dec", "enc_static", "dec_static" ].includes(action))
{
    console.log("\x1b[31m\x1b[1m%s\x1b[0m", "Invalid action. Use 'enc', 'dec', 'enc_static', or 'dec_static'");
    isc.endStandAlone($ERRS.ERR_SUCCESS);
    return;
}

if (action === "enc")
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Encrypted: ${$Cipher.encryptData(data)}`);
}
else if (action === "enc_static")
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Encrypted (static): ${$Cipher.encryptData(data, "static")}`);
}
else if (action === "dec_static")
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Decrypted (static): ${$Cipher.decryptData(data, "static")}`);
}
else
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Decrypted: ${$Cipher.decryptData(data)}`);
}

isc.endStandAlone($ERRS.ERR_SUCCESS);
