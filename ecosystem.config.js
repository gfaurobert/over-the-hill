module.exports = {
  apps: [
    {
      name: 'oth-demo',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/gregoire/oth-demo',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      error_file: '/home/gregoire/pm2Logs/oth-demo/pm2-error.log',
      out_file: '/home/gregoire/pm2Logs/oth-demo/pm2-out.log',
      log_file: '/home/gregoire/pm2Logs/oth-demo/pm2-combined.log',
      time: true,
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
