module.exports = {
  apps: [
    {
      name: "ngaturi-dev",
      script: "npm",
      args: "run dev",

      env: {
        NODE_ENV: "development",
        PORT: "3009",
      },

      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};
