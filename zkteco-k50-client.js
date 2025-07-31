const ZKLib = require('zklib');

class ZKTecoK50Client {
    constructor(ip, port = 4370, timeout = 5000) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
        this.zkInstance = null;
    }

    async connect() {
        try {
            this.zkInstance = new ZKLib(this.ip, this.port, this.timeout, 4000);
            await this.zkInstance.createSocket();
            console.log(`Successfully connected to ZKTeco device at ${this.ip}`);
            return true;
        } catch (error) {
            console.error(`Failed to connect to ZKTeco device at ${this.ip}:`, error.message);
            this.zkInstance = null;
            return false;
        }
    }

    async disconnect() {
        if (this.zkInstance) {
            await this.zkInstance.disconnect();
            console.log(`Disconnected from ZKTeco device at ${this.ip}`);
            this.zkInstance = null;
        }
    }

    async getAttendances() {
        if (!this.zkInstance) {
            console.error('Not connected to ZKTeco device. Cannot get attendances.');
            return [];
        }
        try {
            const result = await this.zkInstance.getAttendances();
            // The data structure can vary. Handle both object with 'data' and direct array.
            if (result && result.data && Array.isArray(result.data)) {
                console.log(`Found ${result.data.length} attendance records.`);
                return result.data;
            }
            if (Array.isArray(result)) {
                console.log(`Found ${result.length} attendance records.`);
                return result;
            }
            console.warn('Attendance data received in an unexpected format:', result);
            return [];
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
            return;
        }
        try {
            await this.zkInstance.clearAttendanceLog();
            console.log('Attendance log cleared from the device.');
        } catch (error) {
            console.error('Error clearing attendance log from the device:', error.message);
        }
    }

    isConnected() {
        // zklib doesn't seem to have a public property for socket status,
        // so we'll rely on our instance check.
        return !!this.zkInstance;
    }
}

module.exports = ZKTecoK50Client;
