import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicBooking from './app/pages/PublicBooking'
import './styles/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/p/:slug" element={<PublicBooking />} />
        <Route path="/booking/:slug" element={<PublicBooking />} />
        <Route path="/" element={<PublicBooking />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
