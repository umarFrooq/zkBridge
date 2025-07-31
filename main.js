const ZKTecoK50Client = require('./zkteco-k50-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class K50HRMIntegration {
    constructor() {
        this.config = this.loadConfig();
        this.client = new ZKTecoK50Client(this.config.deviceIP, this.config.devicePort, this.config.deviceTimeout);
        this.isRunning = false;
        this.syncIntervalId = null;
        this.lastSyncTime = new Date(0); // Initialize to epoch
        this.processedRecordIds = new Set(); // Track processed attendance IDs to prevent duplicates

        // Setup logging
        this.logPath = this.config.logPath || path.join(__dirname, 'logs');
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
        this.logFile = path.join(this.logPath, 'k50-hrm-service.log');
        this.log('INFO', 'K50-HRM Integration service initialized.');
    }

    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        try {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                return JSON.parse(configData);
            } else {
                console.error('FATAL: config.json not found. Please ensure it exists in the same directory.');
                process.exit(1);
            }
        } catch (error) {
            console.error('FATAL: Error reading or parsing config.json:', error.message);
            process.exit(1);
        }
    }

    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `${timestamp} [${level}] - ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;

        if (this.config.logLevel === 'INFO' || (this.config.logLevel === 'ERROR' && level === 'ERROR')) {
             console.log(formattedMessage.trim());
        }
        fs.appendFileSync(this.logFile, formattedMessage);
    }

    async start() {
        this.log('INFO', `Starting ${this.config.serviceName}...`);
        this.isRunning = true;

        await this.sync(); // Perform an initial sync on start

        this.syncIntervalId = setInterval(() => this.sync(), this.config.syncInterval);
        this.log('INFO', `Service started. Sync will run every ${this.config.syncInterval / 1000} seconds.`);
    }

    async stop() {
        this.log('INFO', 'Stopping service...');
        this.isRunning = false;
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        if (this.client.isConnected()) {
            await this.client.disconnect();
        }
        this.log('INFO', 'Service stopped gracefully.');
    }

    getRecordId(record) {
        // Create a unique ID for each attendance record to prevent duplicates.
        // Assumes zklib returns 'userId' and 'recordTime'. Adjust if the field names are different.
        return `${record.userId}-${record.recordTime}`;
    }

    async sync() {
        this.log('INFO', 'Starting attendance data sync cycle...');
        const connected = await this.client.connect();
        if (!connected) {
            this.log('ERROR', 'Could not connect to the ZKTeco device. Skipping this sync cycle.');
            return;
        }

        try {
            const attendances = await this.client.getAttendances();
            this.log('INFO', `Retrieved ${attendances.length} total records from the device.`);

            const newRecords = attendances.filter(record => {
                const recordTime = new Date(record.recordTime);
                const recordId = this.getRecordId(record);
                return recordTime > this.lastSyncTime && !this.processedRecordIds.has(recordId);
            });

            if (newRecords.length === 0) {
                this.log('INFO', 'No new attendance records to sync.');
                return;
            }

            this.log('INFO', `Found ${newRecords.length} new records to process.`);
            const mappedRecords = newRecords.map(rec => this.mapRecord(rec));
            let allBatchesSucceeded = true;

            for (let i = 0; i < mappedRecords.length; i += this.config.batchSize) {
                const batch = mappedRecords.slice(i, i + this.config.batchSize);
                const success = await this.sendToHRM(batch);
                if (success) {
                    this.log('INFO', `Successfully synced batch of ${batch.length} records.`);
                    // Mark records as processed
                    newRecords.slice(i, i + this.config.batchSize).forEach(rec => this.processedRecordIds.add(this.getRecordId(rec)));
                } else {
                    this.log('ERROR', `Failed to sync batch starting at index ${i}. These records will be retried in the next cycle.`);
                    allBatchesSucceeded = false;
                }
            }

            if (allBatchesSucceeded) {
                this.lastSyncTime = new Date(); // Update sync time only if all batches were successful
            }

        } catch (error) {
            this.log('ERROR', 'An error occurred during the sync process:', error.message);
        } finally {
            await this.client.disconnect();
            this.log('INFO', 'Sync cycle finished.');
        }
    }

    mapRecord(record) {
        const { fieldMapping } = this.config;
        const mapped = {};
        // This mapping relies on the user to align config.json's `fieldMapping` values
        // with the actual property names returned by the `zklib` package.
        // For example, if zklib returns `{ userId: '1', recordTime: '...', attType: 1 }`
        // the config.json should map to "deviceUserId": "userId", etc.
        const zklibToConfigMap = {
            userId: 'deviceUserId',
            recordTime: 'recordTime',
            attType: 'attendanceType'
        };

        for (const hrmField in fieldMapping) {
            const configField = fieldMapping[hrmField];
            if (configField === 'deviceId') {
                mapped[hrmField] = this.config.deviceIP;
            } else {
                const zklibField = Object.keys(zklibToConfigMap).find(k => zklibToConfigMap[k] === configField);
                if (record[zklibField] !== undefined) {
                    mapped[hrmField] = record[zklibField];
                }
            }
        }
        return mapped;
    }

    async sendToHRM(records) {
        const { hrmServer } = this.config;
        const url = `${hrmServer.baseURL}${hrmServer.endpoints.attendance}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hrmServer.apiKey}`
        };

        for (let attempt = 1; attempt <= hrmServer.retryAttempts; attempt++) {
            try {
                this.log('INFO', `Sending ${records.length} records to HRM server (Attempt ${attempt})...`);
                const response = await axios.post(url, records, { headers, timeout: hrmServer.timeout });
                if (response.status >= 200 && response.status < 300) {
                    this.log('INFO', 'Data sent to HRM server successfully.');
                    return true;
                }
            } catch (error) {
                this.log('ERROR', `Error sending data to HRM server: ${error.message}`);
                if (attempt < hrmServer.retryAttempts) {
                    this.log('INFO', `Retrying in ${hrmServer.retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, hrmServer.retryDelay));
                } else {
                    this.log('ERROR', 'Max retry attempts reached. Failed to send data for this batch.');
                    return false;
                }
            }
        }
        return false;
    }
}

// Main execution block
(async () => {
    const integration = new K50HRMIntegration();

    if (integration.config.autoStart) {
        await integration.start();
    }

    // Graceful shutdown handler
    const shutdown = async () => {
        await integration.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
})();
