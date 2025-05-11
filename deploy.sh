#!/bin/bash
set -e

echo "Deploying changes to VPS..."

# SSH into the VPS and update the code
sshpass -p 'mDwjP$@"@UJnt7Q/' ssh -o StrictHostKeyChecking=no root@212.85.22.36 "cd /var/www/zapban.com/replit && git fetch origin && git reset --hard origin/devin/1746623437-customer-service-assistant && npm install && cd client && npm install && npm run build && cd .. && pm2 restart all"

echo "Deployment completed successfully!"
