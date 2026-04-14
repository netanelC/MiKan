import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Invalid credentials');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const eventSource = new EventSource('http://localhost:3001/api/auth/qr');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'connected') {
          setStatus('Waiting for QR...');
        } else if (data.qr) {
          setQrCode(data.qr);
          setStatus('Scan QR to link WhatsApp');
        } else if (data.status === 'ready') {
          setQrCode(null);
          setStatus('WhatsApp Linked & Ready!');
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      setStatus('Connection lost');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div
        style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}
      >
        <h2>MiKan Admin Login</h2>
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <input
            type="text"
            placeholder="Username (admin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '0.5rem', fontSize: '1rem' }}
            required
          />
          <input
            type="password"
            placeholder="Password (admin)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.5rem', fontSize: '1rem' }}
            required
          />
          <button type="submit" style={{ padding: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>MiKan Dashboard</h2>
      <h3>Status: {status}</h3>

      {qrCode && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <QRCodeSVG value={qrCode} size={256} />
        </div>
      )}
    </div>
  );
}
