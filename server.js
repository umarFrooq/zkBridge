const net = require('net');
const axios = require('axios');
const url = require('url');
const querystring = require('querystring');
const TCP_PORT = 4370; // ZKTeco ADMS default

require('dotenv').config()
const API_URL = process.env.webhook;


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
                        punch_time: record.timestamp,
                        emp_code: record.uid,
                        device_id: deviceIP,
                        punch_state:record.status
                    };
                    console.log("Forwarding to API:", apiPayload);
const res = await axios.post(API_URL, apiPayload, {
  headers: {
    "api-key": process.env.LAMBDA_KEY,  // pass your secret key here
  },
});                    console.log(`API response for UID ${record.uid}:`, res.status);
                } catch (err) {
                    const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
                    console.error(`Error for
                        
                        
                        warding UID ${record.uid} to API:`, errorMessage);
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




// const net = require('net');

function testZKTecoServer() {
    const client = new net.Socket();
    
    client.connect(4370, 'localhost', () => {
        console.log('Connected to server');
        
        // Simulate ZKTeco attendance data
        const testData = 
            "GET /iclock/cdata?SN=12345678&table=ATTLOG HTTP/1.1\r\n" +
            "Host: localhost:4370\r\n" +
            "Content-Type: text/plain\r\n" +
            "Content-Length: 58\r\n" +
            "\r\n" +
            "0601\t2024-01-15 09:30:00\t1\t1\r\n" +
            "120\t2024-01-15 09:31:00\t0\t1\r\n";
        
        client.write(testData);
        console.log('Sent test attendance data');
    });
    
    client.on('data', (data) => {
        console.log('Server response:', data.toString());
        
        // Test device check-in after receiving response
        setTimeout(() => {
            const checkinData = 
                "GET /iclock/cdata?SN=12345678 HTTP/1.1\r\n" +
                "Host: localhost:4370\r\n" +
                "\r\n";
            
            client.write(checkinData);
            console.log('Sent check-in request');
        }, 1000);
    });
    
    client.on('close', () => {
        console.log('Connection closed');
    });
    
    client.on('error', (err) => {
        console.error('Connection error:', err.message);
    });
    
    // Close connection after 5 seconds
    setTimeout(() => {
        client.destroy();
    }, 5000);
}

// testZKTecoServer();
