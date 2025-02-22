#!/usr/bin/env node
// Made by Ali Abdurraheem <work.ali@abdurraheem.com> AKA Kataki Takanashi //

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');
const net = require('net');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const fetch = require('node-fetch');
const localtunnel = require('localtunnel');

// suppress the deprecation warning
process.removeAllListeners('warning');

if (chalk && chalk.Level) chalk.level = 3;

// command line arguments
const argv = yargs(hideBin(process.argv))
  .option('ollama-url', {
    description: 'Ollama server URL',
    default: 'http://localhost:11434'
  })
  .option('port', {
    description: 'Specific port to use (will find available port if occupied)',
    type: 'number'
  })
  .option('subdomain', {
    description: 'Custom subdomain for localtunnel (optional)',
    type: 'string'
  })
  .option('qr', {
    description: 'Show QR code for connection details',
    type: 'boolean',
    default: false
  })
  .option('force-max-listeners', {
    description: 'Force set maximum number of event listeners (default: 25)',
    type: 'number',
    default: null
  })
  .strict()
  .fail((msg, err, yargs) => {
    if (err) throw err;
    console.error(chalk.red('Error:', msg));
    console.error(chalk.yellow('\nFor available options, run: --help'));
    process.exit(1);
  })
  .help()
  .argv;

// Find an available port
async function findAvailablePort(startPort = argv.port || 3535) {
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  };

  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Generate secure connection details
async function generateConnectionDetails(port) {
  const token = crypto.randomBytes(32).toString('hex');
  let bridge;

  try {
    bridge = await localtunnel({ 
      port,
      subdomain: argv.subdomain
    });

    // Set max listeners if forced
    if (argv.forceMaxListeners !== null) {
      bridge.setMaxListeners(argv.forceMaxListeners);
    } else {
      bridge.setMaxListeners(25);
    }

    // Log connection details
    console.log(chalk.gray('Bridge details:'));
    console.log(chalk.gray('- Local:', `http://127.0.0.1:${port}`));
    console.log(chalk.gray('- Public:', bridge.url));

    // Handle bridge errors
    bridge.on('error', (err) => {
      console.error(chalk.red('Bridge Error:'), err.message);
      cleanup(bridge);
      process.exit(1);
    });

    bridge.on('close', () => {
      console.log(chalk.yellow('\nBridge raised'));
      cleanup(bridge);
      process.exit(0);
    });

    // Handle process termination
    const cleanup = (bridge) => {
      if (bridge) {
        bridge.removeAllListeners();
        bridge.close();
      }
    };

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nRaising bridge...'));
      cleanup(bridge);
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\nRaising bridge...'));
      cleanup(bridge);
      process.exit(0);
    });

    process.on('beforeExit', () => {
      cleanup(bridge);
    });

    return { token, connectionUrl: bridge.url };
  } catch (error) {
    if (bridge) cleanup(bridge);
    console.error(chalk.red('Failed to lower bridge:'), error.message);
    process.exit(1);
  }
}


// Test Ollama connection
async function testOllamaConnection(url) {
  try {
    // Force IPv4 by replacing localhost with 127.0.0.1
    const testUrl = url.replace('localhost', '127.0.0.1');
    const response = await fetch(`${testUrl}/api/tags`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to connect to Ollama:'), error.message);
    return false;
  }
}

async function startServer() {
  // Test Ollama connection first
  const ollamaConnected = await testOllamaConnection(argv.ollamaUrl);
  if (!ollamaConnected) {
    console.error(chalk.red('Please ensure Ollama is running and try again.'));
    process.exit(1);
  }

  const port = await findAvailablePort();
  const { token, connectionUrl } = await generateConnectionDetails(port);

  const app = express();

  // Add body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['*'],
    credentials: true
  }));

  // Security middleware
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authToken = req.headers['x-auth-token'];
    if (!authToken || authToken !== token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        receivedToken: authToken ? 'present' : 'missing',
        tokenMatch: authToken === token
      });
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Proxy middleware
  app.use('/api', createProxyMiddleware({
    target: argv.ollamaUrl.replace('localhost', '127.0.0.1'),
    changeOrigin: true,
    pathRewrite: {'^/api': ''},
    ws: true,
    secure: false,
    onProxyReq: (proxyReq, req, res) => {
      // Clear existing headers to prevent conflicts
      proxyReq.removeHeader('x-auth-token');
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('host');
      
      // Set essential headers
      proxyReq.setHeader('User-Agent', 'ollama-bridge');
      proxyReq.setHeader('Host', '127.0.0.1:11434');
      proxyReq.setHeader('Origin', 'http://127.0.0.1:11434');
      
      // Handle POST request body
      if (req.method === 'POST' && req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Force status code to match the actual response
      proxyRes.statusCode = proxyRes.statusCode;
      
      // Ensure CORS headers
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = '*';
      
      // Set proper content type for JSON responses
      proxyRes.headers['content-type'] = 'application/json';
    },
    onError: (err, req, res) => {
      console.error(chalk.red('Proxy Error:'), err.message);
      res.status(502).json({ error: 'Proxy Error', message: err.message });
    }
  }));

  app.listen(port, '127.0.0.1', () => {
    console.log(chalk.green('\n🚀 Ollama Bridge Server is running!\n'));
    console.log(chalk.yellow('Connection Details:'));
    console.log(chalk.cyan(`URL: ${connectionUrl}`));
    console.log(chalk.cyan(`Token: ${token}\n`));
  
    if (argv.qr) {
      // Generate QR code for easy mobile connection
      qrcode.generate(JSON.stringify({ url: connectionUrl, token }), { small: true });
    }
  
    console.log(chalk.gray('\nPress Ctrl+C to stop the server'));
  });
}

startServer().catch(error => {
  console.error(chalk.red('Fatal Error:'), error);
  process.exit(1);
});