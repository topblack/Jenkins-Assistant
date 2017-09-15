const io = require('socket.io-client');

class TestSocketIO {
    public main() {
        let socket = io('http://localhost:8082/chemjenkins');
        socket.on('connect', (sock: any) => {
            console.info('Connected');
        });
        socket.on('reconnect', (sock: any) => {
            console.info('Reconnected');
        });
        socket.on('disconnect', (sock: any) => {
            console.info('Disconnected');
        });
        socket.on('test', function (data: any) {
            console.info(data);
        });
    }
}

new TestSocketIO().main();