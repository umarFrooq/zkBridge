const ZKLib = require('zklib');

class ZKTecoClient {
    constructor(ip, port = 4370, timeout = 5000) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
        this.zkInstance = null;
        console.log("ZKTecoClient constructor called with:", ip, port, timeout);
    }
    
    async connect() {
        try {
            console.log("connection---------", this.ip, this.port);
            
            // Correct zklib initialization based on official documentation
            this.zkInstance = new ZKLib({
                ip: this.ip,
                port: this.port,
                inport: 5200, // This is required by zklib
                timeout: this.timeout,
                attendanceParser: 'legacy', // String value, not object property
                connectionType: 'udp'
            });
            
            // Connect using callback-based method
            return new Promise((resolve, reject) => {
                this.zkInstance.connect((err) => {
                    if (err) {
                        console.error(`Failed to connect to ZKTeco device at ${this.ip}:`, err);
                        this.zkInstance = null;
                        reject(err);
                    } else {
                        console.log(`Successfully connected to ZKTeco device at ${this.ip}`);
                        resolve(true);
                    }
                });
            });
            
        } catch (error) {
            console.error(`Failed to connect to ZKTeco device at ${this.ip}:`, error.message);
            this.zkInstance = null;
            return false;
        }
    }

    async disconnect() {
        if (this.zkInstance) {
            try {
                return new Promise((resolve) => {
                    this.zkInstance.disconnect(() => {
                        console.log(`Disconnected from ZKTeco device at ${this.ip}`);
                        this.zkInstance = null;
                        resolve();
                    });
                });
            } catch (error) {
                console.error(`Error during disconnection:`, error.message);
                this.zkInstance = null;
            }
        }
    }

    async getAttendances() {
        if (!this.zkInstance) {
            console.error('Not connected to ZKTeco device. Cannot get attendances.');
            return [];
        }
        try {
            return new Promise((resolve, reject) => {
                this.zkInstance.getAttendance((err, result) => {
                    if (err) {
                        console.error('Error fetching attendance records:', err);
                        resolve([]);
                        return;
                    }
                    
                    // The data structure can vary. Handle both object with 'data' and direct array.
                    if (result && result.data && Array.isArray(result.data)) {
                        console.log(`Found ${result.data.length} attendance records.`);
                        resolve(result.data);
                    } else if (Array.isArray(result)) {
                        console.log(`Found ${result.length} attendance records.`);
                        resolve(result);
                    } else {
                        console.warn('Attendance data received in an unexpected format:', result);
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching attendance records:', error.message);
            return [];
        }
    }

    async getUsers() {
        if (!this.zkInstance) {
            console.error('Not connected to ZKTeco device. Cannot get users.');
            return [];
        }
        try {
            const result = await this.zkInstance.getUsers();
            if (result && result.data && Array.isArray(result.data)) {
                console.log(`Found ${result.data.length} users.`);
                return result.data;
            }
            if (Array.isArray(result)) {
                console.log(`Found ${result.length} users.`);
                return result;
            }
            console.warn('User data received in an unexpected format:', result);
            return [];
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return [];
        }
    }

    async clearAttendanceLog() {
        if (!this.zkInstance) {
            console.error('Not connected to ZKTeco device. Cannot clear logs.');
            return false;
        }
        try {
            return new Promise((resolve, reject) => {
                this.zkInstance.clearAttendanceLog((err) => {
                    if (err) {
                        console.error('Error clearing attendance log from the device:', err);
                        resolve(false);
                    } else {
                        console.log('Attendance log cleared from the device.');
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('Error clearing attendance log from the device:', error.message);
            return false;
        }
    }

    isConnected() {
        // Check if we have an instance and if it has a socket
        return !!(this.zkInstance && this.zkInstance.socket && !this.zkInstance.socket.destroyed);
    }

    // Additional utility method to test connection
    async testConnection() {
        if (!this.isConnected()) {
            return await this.connect();
        }
        
        try {
            // Try to get device info as a connection test
            await this.zkInstance.getInfo();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error.message);
            this.zkInstance = null;
            return false;
        }
    }
}

module.exports = ZKTecoClient;