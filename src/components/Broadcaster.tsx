/* eslint-disable no-undef */
import { useEffect, useRef, useState } from 'react'
import { socket } from './socket'

let peerConnections: Record<string, any> = {}

const App = () => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoElement = useRef<HTMLVideoElement>(null)
  const config = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  }

  useEffect(() => {
    socket.on('answer', (id: string, description: any) => {
      peerConnections[id].setRemoteDescription(description)
    })

    socket.on('watcher', (id: string) => {
      const peerConnection = new RTCPeerConnection(config)
      peerConnections[id] = peerConnection

      if (videoElement?.current) {
        let stream = videoElement?.current?.srcObject

        console.log('STREAM', stream)

        if (stream) {
          stream
            .getTracks()
            .forEach((track: RTCTrackEvent) =>
              peerConnection.addTrack(track, stream)
            )
        }
      }

      peerConnection.onicecandidate = (event) => {
        console.log('icecandidate', event.candidate)
        if (event.candidate) {
          socket.emit('candidate', id, event.candidate)
        }
      }

      peerConnection
        .createOffer()
        .then((sdp) => peerConnection.setLocalDescription(sdp))
        .then(() => {
          socket.emit('offer', id, peerConnection.localDescription)
        })
    })

    socket.on('candidate', (id: string, candidate: any) => {
      peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
    })

    socket.on('disconnectPeer', (id: string) => {
      peerConnections[id]?.close()
      delete peerConnections[id]
    })

    getStream()

    return () => {
      socket.close()
    }
  }, [])

  function getStream() {
    if (stream) {
      stream.getTracks().forEach((track: any) => {
        track.stop()
      })
    }

    return navigator.mediaDevices
      .getDisplayMedia({ video: true })
      .then(gotStream)
      .catch(handleError)
  }

  function gotStream(stream: MediaStream) {
    setStream(stream)
    if (videoElement.current) {
      videoElement.current.srcObject = stream
    }
    socket.emit('broadcaster')
  }

  function handleError(error: any) {
    console.error('Error: ', error)
  }

  return (
    <div className='App'>
      <video
        ref={videoElement}
        className='player'
        style={{
          width: '100%',
          height: '100%',
          borderColor: 'blue',
          borderWidth: '2px',
        }}
        autoPlay
        playsInline
        muted
      ></video>
      <div id='errorMsg'></div>
    </div>
  )
}

export default App
