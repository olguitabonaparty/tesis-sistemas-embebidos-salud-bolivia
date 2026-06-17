const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',  // Allow your frontend origin
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
    }
});

app.use(cors({
    origin: 'http://localhost:5173'  // Allow your frontend origin
}));

const useMockData = false;  // Change to false when using Arduino

if (useMockData) {
    function generateMockData() {
        const mockData = {
            Temp_Ambiente: Math.floor(Math.random() * 10) + 20,
            Humedad: Math.floor(Math.random() * 10) + 30,
            Corporal: Math.floor(Math.random() * (39 - 34)) + 34,
            BMP: Math.floor(Math.random() * 40) + 60,
            SpO2: Math.floor(Math.random() * 10) + 70,
            Angulo_superior: Math.floor(Math.random() * 360),
            Angulo_inferior: Math.floor(Math.random() * 360),
            Iluminacion: Math.floor(Math.random() * 30) + 100,
        };
        return mockData;
    }

    setInterval(() => {
        const data = generateMockData();
        console.log('Emitting mock data:', JSON.stringify(data));
        io.emit('serialData', JSON.stringify(data));
    }, 2000);
} else {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    const port = new SerialPort({ path: 'COM4', baudRate: 115200 });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
        console.log('Serial port opened');
    });

    parser.on('data', (data) => {
        console.log('Data:', data);
        io.emit('serialData', data);
    });

    port.on('error', (err) => {
        console.error('Error: ', err.message);
    });
}

io.on('connection', (socket) => {
    console.log('Client connected');
});

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
