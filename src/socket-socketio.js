import io from 'socket.io-client';

export default function (socketUrl, customData, path) {
  // const options = path ? { path } : {};
  const socket = io(socketUrl, { transports: ['websocket'] });
  socket.on('connect', () => {
    console.log(`connect:${socket.id}`);
    socket.customData = customData;
  });

  socket.on('connect_error', (error) => {
    console.log(error);
  });

  socket.on('disconnect', (reason) => {
    console.log(reason);
  });

  return socket;
}
