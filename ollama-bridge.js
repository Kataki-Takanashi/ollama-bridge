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
if (chalk && chalk.Level) chalk.level = 3;
const ngrok = require('@ngrok/ngrok');
const Conf = require('conf').default;

// Add config store
const config = new Conf({
  projectName: 'ollama-bridge'
});

// Check if token exists
const hasStoredToken = !!config.get('ngrokToken');

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
  .option('ngrok-token', {
    description: 'Set Ngrok authtoken (only needed for first run)',
    type: 'string'
  })
  .option('qr', {
    description: 'Show QR code for connection details',
    type: 'boolean',
    default: false
  })
  .epilogue(hasStoredToken ? '' : `
${chalk.yellow('\nFirst Time Setup:')}
${chalk.cyan('1. Sign up for a free ngrok account at https://ngrok.com')}
${chalk.cyan('2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken')}
${chalk.cyan('3. Run with your token: --ngrok-token="your_token_here"')}`)
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
  let storedNgrokToken = config.get('ngrokToken');
  
  if (argv.ngrokToken) {
    storedNgrokToken = argv.ngrokToken;
    config.set('ngrokToken', argv.ngrokToken);
  }
  
  if (!storedNgrokToken) {
    console.error(chalk.red('Ngrok token not found. Please provide it using --ngrok-token'));
    console.log(chalk.yellow('\nTo get started:'));
    console.log(chalk.cyan('1. Sign up for a free ngrok account at https://ngrok.com'));
    console.log(chalk.cyan('2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken'));
    console.log(chalk.cyan('3. Run the script with your token:'));
    console.log(chalk.gray('   ./ollama-bridge --ngrok-token="your_token_here"'));
    console.log(chalk.yellow('\nFor all available options, run:'));
    console.log(chalk.gray('   ./ollama-bridge --help\n'));
    process.exit(1);
  }

  try {
    // ngrok configuration
    const listener = await ngrok.forward({
      addr: port,
      authtoken: storedNgrokToken,
      scheme: 'https',
      allow_h2: 'true',
      inspect: 'false',
      allow_user_agent: 'true',
      domain_allowlist: ['*.abdurraheem.com'], // TODO: Make this a cli argument
      request_header_remove: ['ngrok-skip-browser-warning'],
      metadata: JSON.stringify({
        'cors-origins': ['*'],
        'cors-allow-headers': ['*'],
        'cors-allow-methods': ['GET', 'POST', 'OPTIONS'],
        'cors-allow-credentials': 'true'
      }),
      oauth: null,
      basic_auth: null
    });

    return { token, connectionUrl: listener.url() };
  } catch (error) {
    console.error(chalk.red('Failed to start ngrok:'), error.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down server...'));
  process.exit(0);
});

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

  // Enhanced CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'x-auth-token', 'ngrok-skip-browser-warning', 'User-Agent'],
    exposedHeaders: ['Content-Type', 'Accept', 'x-auth-token', 'ngrok-skip-browser-warning'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // Cache preflight for 24 hours
  }));

  // CORS headers middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, x-auth-token, ngrok-skip-browser-warning, User-Agent');
    res.header('Access-Control-Expose-Headers', 'Content-Type, Accept, x-auth-token, ngrok-skip-browser-warning');
    next();
  });

  // Security middleware after CORS
  app.use((req, res, next) => {
    //  OPTIONS requests with CORS headers
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, x-auth-token, ngrok-skip-browser-warning, User-Agent');
      return res.status(204).end();
    }

    const authToken = req.headers['x-auth-token'];
    if (!authToken || authToken !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
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
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
      proxyReq.setHeader('User-Agent', req.headers['user-agent'] || 'ollama-bridge');
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