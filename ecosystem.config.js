module.exports = {
    apps: [{
      name: 'oth',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/gregoire/over-the-hill',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,  // Single instance
      exec_mode: 'fork',  // Single process
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }]
  }
  