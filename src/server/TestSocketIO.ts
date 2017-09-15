const io = require('socket.io-client');

class TestSocketIO {
    public main() {
        let socket = io('http://shdev.scienceaccelerated.com:8081/chemjenkins');
        socket.on('connect', (sock: any) => {
            console.info('Connected');
        });
        socket.on('reconnect', (sock: any) => {
            console.info('Reconnected');
        });
        socket.on('disconnect', (sock: any) => {
            console.info('Disconnected');
        });
        socket.on('push', function (data: any) {
            console.info(data);
        });
    }
}

new TestSocketIO().main();