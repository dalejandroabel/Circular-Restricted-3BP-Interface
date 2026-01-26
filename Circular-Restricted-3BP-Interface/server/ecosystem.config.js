module.exports = {
  apps: [
    {
      name: "crtbp_api",
      script: "index.js",

      // Puerto lo maneja tu app (3001)
      instances: 1,          // 👈 NO cluster, MySQL + Python
      exec_mode: "fork",

      autorestart: true,
      watch: false,

      max_memory_restart: "500M",

      env: {
        NODE_ENV: "production",
        PORT: 3001
      },

      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true
    }
  ]
};
