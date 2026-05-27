module.exports = {
  apps: [
    {
      name: "ielts-chunk-trainer",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 10000",
      cwd: "/var/www/ielts-chunk-trainer",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
