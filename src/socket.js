import socketio from './socket-socketio';

const PROTOCOLS = { socketio };
export default function (socketUrl, customData, path, protocol, protocolOptions) {
  protocol = protocol || 'socketio';
  const socketProtocol = PROTOCOLS[protocol];

  if (socketProtocol !== undefined) {
    return socketProtocol(socketUrl, customData, path, protocolOptions);
  }
  throw new Error(`Undefined socket protocol ${protocol}`);
}
