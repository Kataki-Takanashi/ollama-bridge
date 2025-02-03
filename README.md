# Ollama Bridge

A secure bridge server that enables remote access to your local Ollama instance through ngrok tunneling.

## Features

- 🔒 Secure remote access to your local Ollama instance
- 🌐 Automatic HTTPS tunneling via ngrok
- 🔑 Token-based authentication
- 📱 QR code support for easy mobile connection
- 🔄 Automatic port selection
- 🚀 Cross-platform support (Windows, macOS, Linux)

## Quick Start

Step 1: Download the binary for your operating system.
Step 2: Run Ollama.
Step 3: Run Ollama Bridge.

### Pre-built Binaries

Download the appropriate binary for your operating system from the releases section:

## Running Ollama Bridge

#### Windows
```bash
ollama-bridge-win.exe --ngrok-token="your_token_here"
```
#### macOS (Intel)
```bash
chmod +x ollama-bridge-macos
./ollama-bridge-macos --ngrok-token="your_token_here"
```
#### macOS (Apple Silicon)
```bash
chmod +x ollama-bridge-macos-arm64
./ollama-bridge-macos-arm64 --ngrok-token="your_token_here"
```
#### Linux
```bash
chmod +x ollama-bridge-linux
./ollama-bridge-linux --ngrok-token="your_token_here"
```

-

### First Time Setup

1. Sign up for a free ngrok account at https://ngrok.com
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run the binary with your token (see examples above)


## Usage Options
| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `--version` | Show version number | boolean | `false` |
| `--ollama-url` | Ollama server URL | string | `http://localhost:11434` |
| `--port` | Specific port to use (will find available port if occupied) | number | - |
| `--ngrok-token` | Set Ngrok authtoken (only needed for first run) | string | - |
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
- All connections are secured via HTTPS (provided by ngrok)
- Authentication is required for all API requests
- Each session generates a unique access token
- Local-only server binding

## API Usage
To make requests to your Ollama instance through the bridge:

1. Use the provided URL and token from the connection details
2. Add the token to your requests:
```bash
# Example: Getting available models
curl -H "x-auth-token: YOUR_TOKEN" https://your-tunnel-url/api/api/tags
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
2. "Ngrok token not found"
   
   - Provide your ngrok token using the --ngrok-token option
   - Token only needs to be set once
3. "Port already in use"
   
   - The server will automatically find an available port
   - Optionally specify a port with --port option

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
[MIT License](LICENSE) - feel free to use this project for personal or commercial purposes.