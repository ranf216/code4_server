module.exports = {
  apps : [
    {
      name   : "code4_staging",
      script: __dirname + "/backend/api/server.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
//     {
//       name   : "code4_files_staging",
//       script: __dirname + "/backend/api/files.js",
//       // Specify which folder to watch
// //      watch: ["backend/platform/api", "backend/platform/config"],
//       // Specify delay between watch interval
//       watch_delay: 1000,
//       // Specify which folder to ignore 
//       ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
//     },
    {
      name   : "code4_cron_remove_logs_staging",
      script: __dirname + "/backend/platform/jobs/cron_remove_logs.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
    {
      name   : "code4_notifications_socket",
      script: __dirname + "/backend/platform/jobs/notifications_socket.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
    {
      name   : "code4_notifications_socket_service",
      script: __dirname + "/backend/platform/jobs/notifications_socket_service.js",
      // Specify which folder to watch
//      watch: ["backend/platform/api", "backend/platform/config"],
      // Specify delay between watch interval
      watch_delay: 1000,
      // Specify which folder to ignore 
      ignore_watch : [__dirname + "/.git", __dirname + "/backend/content", __dirname + "/backend/runtime", __dirname + "/backend/key_value_sets" ],
    },
  ]
}
