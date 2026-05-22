module.exports = {
    apps: [{
      name: 'oth-demo',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/gregoire/oth-demo',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,  // Single instance
      exec_mode: 'fork',  // Single process
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }]
  }
  