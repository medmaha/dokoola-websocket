# Redeploy script for glich.me plaform

git reset 39b74d5 --hard

git pull origin main

pnpm install

pnpm run build

pnpm install --production

refresh