// Deploy script - uses SSH2 through HTTP CONNECT proxy
const { Client } = require('ssh2');
const net = require('net');
const http = require('http');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 18080;
const SERVER = '47.95.242.144';
const SERVER_PORT = 22;
const APP_DIR = '/opt/love-site';

const password = process.env.SERVER_PASS;
if (!password) {
  console.error('Please set SERVER_PASS environment variable');
  process.exit(1);
}

// Create HTTP CONNECT tunnel
function createTunnel(targetHost, targetPort, proxyHost, proxyPort) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.connect(proxyPort, proxyHost, () => {
      socket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n\r\n`);
      let data = '';
      socket.once('data', (chunk) => {
        data += chunk.toString();
        if (data.includes('200 Connection established') || data.includes('200 OK')) {
          resolve(socket);
        } else {
          reject(new Error('Proxy connection failed: ' + data));
        }
      });
    });
    socket.on('error', reject);
    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error('Tunnel timeout'));
    });
  });
}

async function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (data) => { stdout += data.toString(); });
      stream.stderr.on('data', (data) => { stderr += data.toString(); });
    });
  });
}

async function deploy() {
  console.log(`Connecting to ${SERVER} via proxy ${PROXY_HOST}:${PROXY_PORT}...`);
  
  let sock;
  try {
    sock = await createTunnel(SERVER, SERVER_PORT, PROXY_HOST, PROXY_PORT);
    console.log('Tunnel established!');
  } catch (e) {
    console.error('Failed to create tunnel:', e.message);
    process.exit(1);
  }

  const conn = new Client();
  
  conn.on('ready', async () => {
    console.log('SSH Connected!');
    try {
      const commands = [
        `echo "=== Pulling latest code ==="`,
        `cd ${APP_DIR} && git fetch origin 2>&1 && git reset --hard origin/master 2>&1`,
        `echo "=== Installing dependencies ==="`,
        `cd ${APP_DIR} && npm install --production 2>&1`,
        `echo "=== Restarting app ==="`,
        `cd ${APP_DIR} && (pm2 restart love-site 2>&1 || pm2 start server.js --name love-site 2>&1 || npx pm2 restart love-site 2>&1 || npx pm2 start server.js --name love-site 2>&1)`,
        `echo "=== Verifying ==="`,
        `sleep 2`,
        `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3009/health`,
        `echo ""`,
        `echo "=== Done ==="`
      ];

      for (const cmd of commands) {
        console.log(`\n> ${cmd}`);
        const r = await runCommand(conn, cmd);
        if (r.stdout) console.log(r.stdout.slice(0, 1000));
        if (r.stderr) console.error(r.stderr.slice(0, 500));
      }

      console.log('\n✅ Deploy complete!');
    } catch (e) {
      console.error('Deploy error:', e.message);
    }
    conn.end();
    process.exit(0);
  });

  conn.on('error', (err) => {
    console.error('SSH error:', err.message);
    process.exit(1);
  });

  conn.connect({
    sock,
    username: 'root',
    password,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
  });
}

deploy();