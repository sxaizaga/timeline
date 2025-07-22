import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

type TimelineEvent = {
  id?: string;
  date: string;
  description: string;
  imageUrl?: string;
  source: 'kushki-hitos' | 'kushkenos-hitos';
};

const LAMBDA_ENDPOINT = import.meta.env.VITE_LAMBDA_UPLOAD_ENDPOINT;

function App() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    // Escuchar cambios en tiempo real de ambas colecciones
    let unsubKushki: (() => void) | null = null;
    let unsubKushkenos: (() => void) | null = null;
    try {
      const qKushki = query(collection(db, 'kushki-hitos'), orderBy('date'));
      const qKushkenos = query(collection(db, 'kushkenos-hitos'), orderBy('date'));

      unsubKushki = onSnapshot(qKushki, (snapshotKushki) => {
        const kushkiEvents = snapshotKushki.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TimelineEvent[];

        setEvents((prevEvents) => [...kushkiEvents, ...prevEvents.filter((event) => event.source === 'kushkenos-hitos')]);
      });

      unsubKushkenos = onSnapshot(qKushkenos, (snapshotKushkenos) => {
        const kushkenosEvents = snapshotKushkenos.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TimelineEvent[];

        setEvents((prevEvents) => [...prevEvents.filter((event) => event.source === 'kushki-hitos'), ...kushkenosEvents]);
      });
    } catch (error) {
      console.error('Error al escuchar colecciones:', error);
    }

    // Limpiar suscripciones al desmontar el componente
    return () => {
      if (unsubKushki) unsubKushki();
      if (unsubKushkenos) unsubKushkenos();
    };
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description) return;
    try {
      let imageUrl = '';
      if (image) {
        // Convertir imagen a base64
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            // Quitar el prefijo "data:mimetype;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = error => reject(error);
        });
        const base64 = await toBase64(image);
        const payload = {
          base64,
          filename: image.name,
          mimetype: image.type,
        };
        const res = await fetch(LAMBDA_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Error subiendo imagen');
        const data = await res.json();
        imageUrl = data.url;
      }
      await addDoc(collection(db, 'kushkenos-hitos'), {
        date,
        description,
        imageUrl: imageUrl || null,
        created: Timestamp.now(),
      });
      setDate('');
      setDescription('');
      setImage(null);
    } catch {
      setError('Error al guardar el evento. Revisa la configuración de Firebase o el backend.');
    }
  };

  const kushkenosColors = [
    { bg: '#e1f5fe', text: '#01579b' },
    { bg: '#f1f8e9', text: '#33691e' },
    { bg: '#fff3e0', text: '#e65100' },
    { bg: '#f3e5f5', text: '#6a1b9a' },
    { bg: '#e8f5e9', text: '#2e7d32' },
    { bg: '#e8eaf6', text: '#283593' },
  ];

  return (
    <>
      <div className="timeline-container" style={{ maxWidth: '100vw', width: '100%', overflowX: 'auto', background: 'none', boxShadow: 'none', padding: 0 }}>
        <ul className="timeline-list">
          {events.map((event, idx) => {
            const isTop = idx % 2 === 1;
            let cardStyle: { background?: string; color?: string } = {};
            let dateStyle = {};
            let eventClass = '';
            if (event.source === 'kushki-hitos') {
              eventClass = '';
            } else {
              const color = kushkenosColors[idx % kushkenosColors.length];
              cardStyle = { background: color.bg, color: color.text };
              dateStyle = { background: color.bg, color: color.text };
              eventClass = ' kushkenos-event';
            }
            return (
              <li
                key={event.id || event.date + event.description}
                className={`timeline-event${isTop ? ' timeline-event--top' : ' timeline-event--bottom'}${eventClass}`}
                onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                style={{ position: 'relative', cursor: event.imageUrl ? 'pointer' : 'default' }}
              >
                <div className="timeline-node-wrapper">
                  <span className="event-date" style={dateStyle}>
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt="preview adjunto"
                        style={{
                          width: 36,
                          height: 36,
                          objectFit: 'cover',
                          borderRadius: '50%',
                          border: '2px solid #fff',
                          boxShadow: '0 2px 8px #0003',
                          display: 'block',
                        }}
                      />
                    ) : null}
                  </span>
                </div>
                {isTop ? (
                  <div className="timeline-card timeline-card--top" style={cardStyle}>
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc" style={cardStyle}>{event.description}</span>
                  </div>
                ) : (
                  <div className="timeline-card timeline-card--bottom" style={cardStyle}>
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc" style={cardStyle}>{event.description}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Dialog para mostrar la imagen */}
      {selectedIdx !== null && events[selectedIdx]?.imageUrl && (
        <div
          className="timeline-image-dialog"
          onClick={() => setSelectedIdx(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedIdx(null)}
              style={{
                position: 'absolute',
                top: -24,
                right: -24,
                background: '#fff',
                border: 'none',
                borderRadius: 6,
                width: 36,
                height: 36,
                fontSize: 22,
                fontWeight: 'bold',
                color: '#333',
                boxShadow: '0 2px 8px #0005',
                cursor: 'pointer',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              aria-label="Cerrar imagen"
            >
              ×
            </button>
            <img
              src={events[selectedIdx].imageUrl}
              alt="Imagen del evento"
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: 16,
                boxShadow: '0 8px 32px #000a',
                background: '#fff',
                padding: 8,
              }}
            />
          </div>
        </div>
      )}

      <div className="event-form-footer">
        {error && <div style={{color: 'red', marginBottom: 10}}>{error}</div>}
        <form className="event-form" onSubmit={handleAddEvent} style={{marginBottom: 0}}>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Descripción del evento"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={e => setImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            style={{ maxWidth: 120 }}
          />
          <button type="submit">Agregar evento</button>
        </form>
      </div>
    </>
  );
}

export default App;
