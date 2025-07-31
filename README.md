# ZKTeco K50 to HRM Integration Service

This service acts as a bridge between a ZKTeco K50 biometric attendance device and an HRM (Human Resource Management) backend API. It periodically fetches attendance records from the device and pushes them to the HRM server.

## Features

- Connects to ZKTeco K50 devices using IP address and port.
- Fetches attendance logs periodically.
- Pushes data to a configurable HRM backend API.
- Can be run as a standalone executable or installed as a Windows Service.
- Automatic retry mechanism for API calls.
- Configurable data mapping between device fields and API fields.
- Detailed logging for monitoring and troubleshooting.

## Quick Setup

### Step 1: Configuration

Before running the service, you must edit the `config.json` file to match your environment:

1.  **`deviceIP`**: Set this to the IP address of your ZKTeco K50 device.
2.  **`hrmServer.baseURL`**: The base URL of your HRM API (e.g., `https://api.your-hrm.com`).
3.  **`hrmServer.apiKey`**: The API key for authenticating with your HRM server.
4.  Review other settings like `syncInterval` and `devicePort` if needed.

### Step 2: Running the Service

You have three main options to run the service:

#### Method 1: Using the Executable (Recommended)

1.  Navigate to the `dist` folder after building the project.
2.  Run `zkteco-k50-service.exe` directly.
3.  Alternatively, you can use the `startup.bat` script in the root directory, which will automatically find and run the executable.

#### Method 2: Install as a Windows Service

This method allows the service to run automatically in the background and restart on system boot.

1.  Open Command Prompt or PowerShell **as an Administrator**.
2.  Navigate to the project directory.
3.  Run the command: `npm run install-service`
4.  The service will be installed and started automatically.

To uninstall the service, run: `npm run uninstall-service`

#### Method 3: Running with Node.js (for development)

1.  Make sure you have Node.js installed.
2.  Open a terminal in the project directory.
3.  Run `npm install` to install dependencies.
4.  Run `npm start` to start the service.

## Building from Source

If you need to build the executable (`.exe`) from the source code:

1.  Make sure you have Node.js installed.
2.  Open a terminal in the project directory.
3.  Run `npm install` to install all dependencies, including development ones.
4.  Run the build command: `npm run build-win`
5.  The executable will be created in the `dist` folder.

## Data and Logs

-   **Logs**: All operational logs are stored in the `./logs` directory. Check `k50-hrm-service.log` for details about sync cycles, connections, and errors.
-   **Configuration**: All settings are managed in `config.json`.
-   **Backup**: The `backupPath` in the config can be used to store backups of attendance data (this feature can be extended in `main.js`).

## Commands Summary

-   `npm start`: Run the service directly using Node.js.
-   `npm run build-win`: Build the Windows executable.
-   `npm run install-service`: Install as a Windows service (requires admin rights).
-   `npm run uninstall-service`: Remove the Windows service (requires admin rights).