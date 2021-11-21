/* eslint-disable no-undef */
import logo from './logo.svg'
import './App.css'
import { useEffect, useRef, useState } from 'react'
import adapter from 'webrtc-adapter'
import { io } from 'socket.io-client'
import P2P from 'socket.io-p2p'

const socket = io('http://localhost:3031')
// const p2p = new P2P(socket, { useSockets: false })

// socket.on('connect', () => {
//   console.log(socket.id) // ojIckSD2jqNzOqIrAGzL
// })
// p2p.on('peer-msg', function (data) {
//   console.log('From a peer %s', data)
// })

// p2p.emit('peer-msg', 'hello world')
// const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

// const peerConnection = new RTCPeerConnection(configuration)
// const signalingChannel = new SignalingChannel(remoteClientId)
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const App = () => {
  const [streamUrl, setStreamUrl] = useState('')
  const [peerStream, setPeerStream] = useState(null)
  const startButton = useRef()
  const peerConnection = useRef()
  const remoteVideo = useRef()
  const start = () => {
    navigator.mediaDevices
      .getDisplayMedia({ video: true })
      .then(handleSuccess, handleError)
  }

  const handleSuccess = async (stream) => {
    startButton.current.disabled = true
    // const video = document.querySelector('video')
    remoteVideo.current.srcObject = stream
    // setPeerStream(stream)
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream)
    })

    socket.emit('stream', stream)

    // demonstrates how to detect that the user has stopped
    // sharing the screen via the browser UI.
    // stream.getVideoTracks()[0].addEventListener('ended', () => {
    //   errorMsg('The user has ended sharing the screen')
    //   startButton.current.disabled = false
    // })
  }

  const errorMsg = (msg, error) => {
    const errorElement = document.querySelector('#errorMsg')
    errorElement.innerHTML += `<p>${msg}</p>`
    if (typeof error !== 'undefined') {
      console.error(error)
    }
  }

  const handleError = (error) => {
    errorMsg(`getDisplayMedia error: ${error.name}`, error)
  }

  useEffect(() => {
    // Polyfill in Firefox.
    // See https://blog.mozilla.org/webrtc/getdisplaymedia-now-available-in-adapter-js/
    if (!adapter) return
    // initializeChannel()
    // connect()

    socket.on('offer-client', async (offer) => {
      console.log('received offer')
      if (!peerConnection.current) {
        peerConnection.current = new RTCPeerConnection(configuration)
        createPeerConnectionListeners()
      }

      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      )
      const answer = await peerConnection.current.createAnswer()
      await peerConnection.current.setLocalDescription(answer)
      socket.emit('answer', answer)
    })

    socket.on('stream-client', (stream) => {
      console.log('STREAM')
      console.log(stream)
      // remoteVideo.current.srcObject = stream
    })

    socket.on('answer-client', async (answer) => {
      console.log('received answer-client')
      const remoteDesc = new RTCSessionDescription(answer)
      await peerConnection.current.setRemoteDescription(remoteDesc)
      const getIce = peerConnection.current.canTrickleIceCandidates

      console.log(
        'can trickle',
        getIce,
        peerConnection,
        peerConnection.current.connectionState
      )
    })

    socket.on('ice-candidate-client', async (iceCandidate) => {
      console.log('ICE CANDIDATE', iceCandidate)
      if (iceCandidate) {
        try {
          await peerConnection.current.addIceCandidate(iceCandidate)
          console.log('added ice candidate')
        } catch (e) {
          console.error('Error adding received ice candidate', e)
        }
      }
    })

    if (adapter.browserDetails.browser === 'firefox') {
      adapter.browserShim.shimGetDisplayMedia(window, 'screen')
    }

    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      startButton.current.disabled = false
    } else {
      errorMsg('getDisplayMedia is not supported')
    }
  }, [])

  const makeCall = async () => {
    peerConnection.current = new RTCPeerConnection(configuration)
    socket.emit('answer-client', async (answer) => {
      if (answer) {
        const remoteDesc = new RTCSessionDescription(answer)
        await peerConnection.current.setRemoteDescription(remoteDesc)
      }
    })
    const offer = await peerConnection.current.createOffer()
    await peerConnection.current.setLocalDescription(offer)
    socket.emit('offer', offer)

    createPeerConnectionListeners()
  }

  const createPeerConnectionListeners = () => {
    peerConnection.current.onicecandidate = (event) => {
      console.log('got ice', 'calling ice')
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate)
      }
    }
    // peerConnection.current.addEventListener('icecandidate', (event) => {
    //   console.log('got ice', 'calling ice')
    //   if (event.candidate) {
    //     socket.emit('ice-candidate', event.candidate)
    //   }
    // })

    // peerConnection.current.addEventListener()

    peerConnection.current.addEventListener('icecandidateerror', (event) => {
      if (peerConnection.current.connectionState === 'connected') {
        // Peers connected!
        console.log('success')
      }

      console.log('peerconnect', event)
    })
    peerConnection.current.addEventListener(
      'connectionstatechange',
      (event) => {
        if (peerConnection.current.connectionState === 'connected') {
          // Peers connected!
          console.log('success')
        }

        console.log('peerconnect', event)
      }
    )
  }

  useEffect(() => {
    if (!peerConnection.current) return

    getRemoteStream()
  }, [peerConnection])

  const getRemoteStream = () => {
    const remoteStream = new MediaStream()
    remoteVideo.current.srcObject = remoteStream

    peerConnection.current.addEventListener('track', async (event) => {
      console.log('track event', event.track)
      remoteStream.addTrack(event.track, remoteStream)
    })
  }

  const handleStreamUrlChange = (event) => {
    setStreamUrl(event.target.value)
  }

  const getStreamUrl = () => {}

  return (
    <div className='App'>
      <input
        value={streamUrl}
        onChange={handleStreamUrlChange}
        onSubmit={getStreamUrl}
      />
      <button ref={startButton} onClick={start}>
        start
      </button>
      <button onClick={makeCall}>get remote stream</button>
      <video
        ref={remoteVideo}
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
