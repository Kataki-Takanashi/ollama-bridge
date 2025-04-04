# Ollama Bridge

A secure bridge server that enables remote access to your local Ollama instance through ngrok tunneling.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
  - [Download](#pre-built-binaries)
  - [Running Ollama Bridge](#running-ollama-bridge)
- [Usage Options](#usage-options)
- [Building from Source](#building-from-source)
  - [Prerequisites](#prerequisites)
  - [Build Steps](#build-steps)
- [Security](#security)
- [API Usage](#api-usage)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🔒 Secure remote access to your local Ollama instance
- 🌐 Automatic HTTPS tunneling via localtunnel
- 🔑 Token-based authentication
- 📱 QR code support for easy mobile connection
- 🔄 Automatic port selection
- 🚀 Cross-platform support (Windows, macOS, Linux)

## Quick Start

Step 1: Download the binary for your operating system.

Step 2: Run Ollama.

Step 3: Run Ollama Bridge.

### Pre-built Binaries

Download the appropriate binary for your operating system from [the releases section](https://github.com/Kataki-Takanashi/ollama-bridge/releases/latest):

## Running Ollama Bridge

#### Windows
```bash
ollama-bridge-win.exe
```

For **MacOS** users, please note that it will likely throw an error, to solve please see #7 in [Common Issues](#common-issues)!
#### macOS (Intel)
```bash
chmod +x ollama-bridge-macos
./ollama-bridge-macos
```
#### macOS (Apple Silicon)
```bash
chmod +x ollama-bridge-macos-arm64
./ollama-bridge-macos-arm64
```
#### Linux
```bash
chmod +x ollama-bridge-linux
./ollama-bridge-linux
```

## Usage Options
| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `--version` | Show version number | boolean | `false` |
| `--ollama-url` | Ollama server URL | string | `http://localhost:11434` |
| `--port` | Specific port to use (will find available port if occupied) | number | - |
| `--subdomain` | Custom subdomain for localtunnel (optional) | string | - |
| `--force-max-listeners` | Force set maximum number of event listeners | number | 25 |
| `--qr` | Show QR code for connection details | boolean | `false` |
| `--help` | Show help | boolean | `false` |


## Building from Source
### Prerequisites
- Node.js 18 or later
- npm or yarn

### Build Steps
1. Clone the repository:
```bash
git clone https://github.com/yourusername/ollama-bridge.git
cd ollama-bridge
```
2. Install dependencies:
```bash
npm install
```
3. Install `pkg` globally:
```bash
npm install -g pkg
```
4. Build the executables:
```bash
npm run build
```
The compiled binaries will be available in the `dist` directory.

## Security
- All connections are secured via HTTPS (provided by localtunnel)
- Authentication is required for all API requests
- Each session generates a unique access token

## API Usage
To make requests to your Ollama instance through the bridge:

1. Use the provided URL and token from the connection details
2. Add the token to your requests:
3. If using a browser, make sure to respect CORS

```bash
# Example: Getting available models
curl -H "x-auth-token: YOUR_TOKEN" -H "bypass-tunnel-reminder: true" https://your-tunnel-url/api/api/tags
```

```bash
# Example: Creating a chat completion
curl -H "x-auth-token: YOUR_TOKEN" https://your-tunnel-url/api/api/chat -d '{
  "model": "llama2",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

## Troubleshooting
### Common Issues
1. "Failed to connect to Ollama"
   
   - Ensure Ollama is running locally
   - Check if Ollama is accessible at http://localhost:11434
2. "Port already in use"
   
   - The server will automatically find an available port
   - Optionally specify a port with --port option

3. "403"
  - Likely a server side error, plz make an issue.

4. You get an html page back with the API
  - Include "bypass-tunnel-reminder: true" in your headers

5. Connection timeout
  - Check your internet connection
  - Try restarting the bridge server

6. Slow model responses
  - Check your GPU/CPU usage and free up RAM on the host machine
  - Consider using a lighter model variant, the reccomended model is "[ifioravanti/mistral-grammar-checker:latest](https://ollama.com/ifioravanti/mistral-grammar-checker)"
  - Use a better host machine with more RAM and / or a better GPU

7. "macOS cannot verify that this app is free from malware"
   - This is due to macOS Gatekeeper security feature
   - Solution 1: Right-click (or Control-click) the app and select "Open" from the context menu
   - Solution 2: In System Settings > Privacy & Security, scroll down and click "Open Anyway"
   - Solution 3: Run this command in terminal (replace with your binary name):
     ```bash
     xattr -d com.apple.quarantine ./ollama-bridge-macos-arm64
     ```

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
[MIT License](LICENSE) - feel free to use this project for personal or commercial purposes.