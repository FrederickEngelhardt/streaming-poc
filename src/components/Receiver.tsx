import { useEffect, useState, useRef } from 'react'
import { socket } from './socket'

const Receiver = () => {
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const config = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    }

    socket.on('offer', (id: string, description: any) => {
      const pc = new RTCPeerConnection(config)
      setPeerConnection(pc)

      if (pc) {
        pc.setRemoteDescription(description)
          .then(() => pc.createAnswer())
          .then((sdp) => pc.setLocalDescription(sdp))
          .then(() => {
            socket.emit('answer', id, pc.localDescription)
          })

        pc.ontrack = (event) => {
          if (video?.current) {
            video.current.srcObject = event.streams[0]
          }
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('candidate', id, event.candidate)
          }
        }
      }
    })

    socket.on('candidate', (id: string, candidate: any) => {
      if (!peerConnection) return
      peerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((e) => console.error(e))
    })

    socket.on('connect', () => {
      socket.emit('watcher')
    })

    socket.on('broadcaster', () => {
      socket.emit('watcher')
    })

    return () => {
      socket.close()
      peerConnection?.close()
    }
  }, [])

  return (
    <div>
      <video ref={video} playsInline autoPlay muted></video>
    </div>
  )
}

export default Receiver
