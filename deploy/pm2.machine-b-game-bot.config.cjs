module.exports = {
  apps: [
    {
      name: 'scum-watcher',
      script: 'src/services/scumLogWatcherRuntime.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PERSIST_REQUIRE_DB: 'true',
        PERSIST_LEGACY_SNAPSHOTS: 'false',
        SCUM_WATCHER_HEALTH_HOST: '127.0.0.1',
        SCUM_WATCHER_HEALTH_PORT: '3212',
      },
    },
    {
      name: 'scum-console-agent',
      script: 'src/scum-console-agent.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PERSIST_REQUIRE_DB: 'true',
        PERSIST_LEGACY_SNAPSHOTS: 'false',
        SCUM_CONSOLE_AGENT_HOST: '0.0.0.0',
        SCUM_CONSOLE_AGENT_PORT: '3213',
      },
    },
  ],
};
