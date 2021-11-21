const express = require('express')
const app = express()
const { Server } = require('socket.io')

let broadcaster
const port = 3001

const http = require('http')
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://192.168.1.191:3000', 'http://localhost:3000'],
    credentials: true,
  },
})

// app.use(express.static(__dirname + '/public'))

io.sockets.on('error', (e) => console.log(e))
io.sockets.on('connection', (socket) => {
  console.log('connected', socket.id)
  socket.on('broadcaster', () => {
    broadcaster = socket.id
    socket.broadcast.emit('broadcaster')
  })
  socket.on('watcher', () => {
    console.log('watcher', socket.id)
    socket.to(broadcaster).emit('watcher', socket.id)
  })
  socket.on('offer', (id, message) => {
    socket.to(id).emit('offer', socket.id, message)
  })
  socket.on('answer', (id, message) => {
    socket.to(id).emit('answer', socket.id, message)
  })
  socket.on('candidate', (id, message) => {
    console.log('candidate')
    socket.to(id).emit('candidate', socket.id, message)
  })
  socket.on('disconnect', () => {
    socket.to(broadcaster).emit('disconnectPeer', socket.id)
  })
})

server.listen(port, '192.168.1.191', () =>
  console.log(`Server is running on port ${port}`)
)
