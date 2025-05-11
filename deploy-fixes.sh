set -e

echo "Deploying fixes to VPS..."

TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

cp -r /home/ubuntu/repos/replit/client/src/hooks/use-instance.ts $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/client/src/lib/websocket.ts $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/client/src/contexts/AuthContext.tsx $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/client/src/hooks/use-auth.tsx $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/server/controllers/instance.ts $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/shared/schema.ts $TEMP_DIR/
cp -r /home/ubuntu/repos/replit/server/storage.ts $TEMP_DIR/

cat > $TEMP_DIR/apply-fixes.js << 'EOL'
const fs = require('fs');
const path = require('path');

// Base directory for the application
const BASE_DIR = '/var/www/zapban/code';

// Files to update
const filesToUpdate = {
  '/tmp/zapban-fixes/use-instance.ts': 'client/src/hooks/use-instance.ts',
  '/tmp/zapban-fixes/websocket.ts': 'client/src/lib/websocket.ts',
  '/tmp/zapban-fixes/AuthContext.tsx': 'client/src/contexts/AuthContext.tsx',
  '/tmp/zapban-fixes/use-auth.tsx': 'client/src/hooks/use-auth.tsx',
  '/tmp/zapban-fixes/instance.ts': 'server/controllers/instance.ts',
  '/tmp/zapban-fixes/schema.ts': 'shared/schema.ts',
  '/tmp/zapban-fixes/storage.ts': 'server/storage.ts'
};

// Create backup directory
const backupDir = path.join(BASE_DIR, 'backups', new Date().toISOString().replace(/:/g, '-'));
fs.mkdirSync(backupDir, { recursive: true });
console.log(`Created backup directory: ${backupDir}`);

// Process each file
Object.entries(filesToUpdate).forEach(([localPath, remotePath]) => {
  const fullRemotePath = path.join(BASE_DIR, remotePath);
  const dirName = path.dirname(fullRemotePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
    console.log(`Created directory: ${dirName}`);
  }
  
  // Backup existing file if it exists
  if (fs.existsSync(fullRemotePath)) {
    const backupPath = path.join(backupDir, remotePath);
    const backupDirName = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDirName)) {
      fs.mkdirSync(backupDirName, { recursive: true });
    }
    
    fs.copyFileSync(fullRemotePath, backupPath);
    console.log(`Backed up ${fullRemotePath} to ${backupPath}`);
  }
  
  // Copy new file
  try {
    fs.copyFileSync(localPath, fullRemotePath);
    console.log(`Updated ${fullRemotePath}`);
  } catch (error) {
    console.error(`Error updating ${fullRemotePath}:`, error);
  }
});

console.log('All files updated successfully!');
console.log('Restarting services...');
EOL

cat > $TEMP_DIR/restart-services.sh << 'EOL'
set -e

echo "Restarting services..."
pm2 restart zapban
pm2 restart supabase-proxy

echo "Services restarted successfully!"
EOL

chmod +x $TEMP_DIR/restart-services.sh

echo "Copying files to VPS..."
ssh root@212.85.22.36 "mkdir -p /tmp/zapban-fixes"
scp -r $TEMP_DIR/* root@212.85.22.36:/tmp/zapban-fixes/

echo "Applying fixes on VPS..."
ssh root@212.85.22.36 "cd /tmp/zapban-fixes && node apply-fixes.js && ./restart-services.sh"

echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo "Deployment completed successfully!"
