const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "socket.code4axis.app", "Notifications/socket_service");


new $SocketService($Config.get("socket")).startService(isc, (userInfo, data) =>
{
    $Logger.logString($Const.LL_DEBUG, JSON.stringify({userInfo, data}));
});
