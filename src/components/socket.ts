import io from 'socket.io-client'

const SERVER_IP = 'http://192.168.1.191:3001'
export const socket = io.connect(SERVER_IP, {
  transports: ['websocket'],
})
