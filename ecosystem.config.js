module.exports = {
  apps: [{
    name: "zapban",
    script: "./dist/server/index.js",
    instances: 1,
    exec_mode: "fork",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 5000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 5000
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "/var/www/zapban/logs/pm2-error.log",
    out_file: "/var/www/zapban/logs/pm2-out.log",
    merge_logs: true,
    max_memory_restart: "500M",
    restart_delay: 5000,
    wait_ready: true,
    listen_timeout: 30000,
    kill_timeout: 5000
  }]
}
