import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type BotStatus = 'disconnected' | 'qr_ready' | 'authenticated' | 'ready' | 'auth_failure' | 'error';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<BotStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setStatus(data.status);

        if (data.status === 'qr_ready') {
          setQrCode(data.qr);
          setErrorMessage(null);
        } else if (data.status === 'ready' || data.status === 'authenticated') {
          setQrCode(null);
          setErrorMessage(null);
        } else if (data.status === 'auth_failure') {
          setQrCode(null);
          setErrorMessage(data.message || 'Authentication failed');
        } else if (data.status === 'disconnected') {
          setQrCode(null);
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      setErrorMessage('Lost connection to backend');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'disconnected':
        return 'Disconnected - Starting...';
      case 'qr_ready':
        return 'Scan QR code to link WhatsApp';
      case 'authenticated':
        return 'Authenticated! Finishing setup...';
      case 'ready':
        return 'WhatsApp Linked & Active';
      case 'auth_failure':
        return 'Authentication Failed';
      case 'error':
        return 'System Error';
      default:
        return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}
      >
        <h2 style={{ textAlign: 'center' }}>MiKan Admin Login</h2>
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
            required
          />
          <button
            type="submit"
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              cursor: 'pointer',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            Login to Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#075E54' }}>MiKan Management Dashboard</h2>

      <div
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          borderRadius: '20px',
          backgroundColor: status === 'ready' ? '#DCF8C6' : '#f0f0f0',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ margin: 0 }}>Status: {getStatusDisplay()}</h3>
      </div>

      {errorMessage && (
        <div style={{ color: '#ea0038', marginBottom: '1rem', fontWeight: 'bold' }}>
          Error: {errorMessage}
        </div>
      )}

      {qrCode && (
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              borderRadius: '8px',
            }}
          >
            <QRCodeSVG value={qrCode} size={300} />
          </div>
          <p style={{ color: '#666' }}>Open WhatsApp on your phone and scan this code</p>
        </div>
      )}

      {status === 'ready' && (
        <div style={{ marginTop: '2rem', color: '#444' }}>
          <p>Your WhatsApp account is successfully paired and the bot is monitoring the group.</p>
        </div>
      )}
    </div>
  );
}
