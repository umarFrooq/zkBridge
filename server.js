const net = require('net');
const axios = require('axios');
const url = require('url');
const querystring = require('querystring');

const TCP_PORT = 4370; // ZKTeco ADMS default
const API_URL = "https://api-hr-jazeera.codetricksolutions.com/v1/checkin/machine-checkin";

const server = net.createServer((socket) => {
    const deviceIP = socket.remoteAddress;
    console.log(`Device connected: ${deviceIP}`);

    socket.on('data', async (data) => {
        const rawData = data.toString().trim();
        console.log("Raw push data:\n", rawData);

        // ZKTeco devices send HTTP-like requests. We need to parse them.
        const requestLine = rawData.split('\r\n')[0];
        const requestUrl = requestLine.split(' ')[1];
        if (!requestUrl) {
            console.log("Could not parse request URL. Sending back OK.");
            socket.write("OK"); // Send a generic OK for unknown data
            return;
        }

        const parsedUrl = url.parse(requestUrl);
        const queryParams = querystring.parse(parsedUrl.query);
        const sn = queryParams.SN;

        console.log(`Received data from device SN: ${sn}`);

        // The actual data is in the body of the TCP packet
        const bodyIndex = rawData.indexOf('\r\n\r\n');
        const body = bodyIndex !== -1 ? rawData.substring(bodyIndex).trim() : "";

        // Respond to the device to acknowledge receipt
        // The device expects an "OK" response to know the server is alive.
        const responseToDevice = "HTTP/1.1 200 OK\r\n" +
                               "Content-Type: text/plain\r\n" +
                               "Connection: close\r\n\r\n" +
                               "OK\r\n";
        socket.write(responseToDevice);

        if (queryParams.table === 'ATTLOG' && body) {
            console.log('Parsing ATTLOG data...');
            const records = body.split('\r\n').filter(line => line);
            const parsedRecords = records.map(record => {
                const [uid, timestamp, status, verification] = record.split('\t');
                return {
                    sn,
                    uid,
                    timestamp,
                    status,
                    verification
                };
            });

            console.log('Parsed records:', parsedRecords);

            // Forward each record to the API
            for (const record of parsedRecords) {
                try {
                    const apiPayload = {
                        SN: record.sn,
                        scan_time: record.timestamp,
                        employee_code: record.uid,
                        ip: deviceIP
                    };
                    console.log("Forwarding to API:", apiPayload);
                    const res = await axios.post(API_URL, apiPayload);
                    console.log(`API response for UID ${record.uid}:`, res.status);
                } catch (err) {
                    const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
                    console.error(`Error forwarding UID ${record.uid} to API:`, errorMessage);
                }
            }
        } else if (requestUrl.startsWith('/iclock/cdata')) {
             console.log('Device is checking in or sending other data.');
        } else if (requestUrl.startsWith('/iclock/getrequest')) {
            console.log('Device is making a getrequest.');
        } else {
            console.log('Received non-ATTLOG or empty data from device.');
        }
    });

    socket.on('end', () => {
        console.log('Device disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

server.listen(TCP_PORT, () => {
    console.log(`ZKTeco listener running on port ${TCP_PORT}`);
});
