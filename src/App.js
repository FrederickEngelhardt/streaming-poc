import * as React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'

import Broadcaster from './components/Broadcaster'
import Reciever from './components/Receiver'

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path='/' element={<Reciever />} />
        <Route path='broadcast' element={<Broadcaster />} />
      </Routes>
    </div>
  )
}

export default App
