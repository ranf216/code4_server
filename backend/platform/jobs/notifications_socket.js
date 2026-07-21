const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "socket.code4axis.app", "Notifications/socket");


new $SocketService($Config.get("socket")).startSocket(isc);
