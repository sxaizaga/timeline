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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
      <div className="timeline-container">
        <ul className="timeline">
          {events.map((event, idx) => {
            const isTop = idx % 2 === 1;
            let cardStyle = {};
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
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ position: 'relative' }}
              >
                <div className="timeline-node-wrapper">
                  <span className="event-date" style={dateStyle}></span>
                </div>
                {isTop ? (
                  <div className="timeline-card timeline-card--top" style={cardStyle}>
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc" style={cardStyle}>{event.description}</span>
                    {event.imageUrl && hoveredIdx === idx && (
                      <img
                        src={event.imageUrl}
                        alt="Imagen del evento"
                        style={{
                          maxWidth: 220,
                          maxHeight: 180,
                          borderRadius: 12,
                          marginTop: 10,
                          boxShadow: '0 4px 18px #0006',
                          position: 'absolute',
                          left: '50%',
                          top: '100%',
                          transform: 'translate(-50%, 10px)',
                          zIndex: 10,
                          background: '#fff',
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="timeline-card timeline-card--bottom" style={cardStyle}>
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc" style={cardStyle}>{event.description}</span>
                    {event.imageUrl && hoveredIdx === idx && (
                      <img
                        src={event.imageUrl}
                        alt="Imagen del evento"
                        style={{
                          maxWidth: 220,
                          maxHeight: 180,
                          borderRadius: 12,
                          marginTop: 10,
                          boxShadow: '0 4px 18px #0006',
                          position: 'absolute',
                          left: '50%',
                          top: '100%',
                          transform: 'translate(-50%, 10px)',
                          zIndex: 10,
                          background: '#fff',
                        }}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
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
