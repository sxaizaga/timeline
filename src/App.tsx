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
  name?: string;
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
  const [name, setName] = useState('');
  const [touched, setTouched] = useState<{date: boolean; name: boolean; description: boolean}>({date: false, name: false, description: false});

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
          source: 'kushki-hitos',
        })) as TimelineEvent[];
        setEvents((prev) => {
          // Si ya hay eventos de ambas fuentes, combinamos y ordenamos
          const kushkenos = prev.filter(e => e.source === 'kushkenos-hitos');
          return sortEvents([...kushkiEvents, ...kushkenos]);
        });
      });

      unsubKushkenos = onSnapshot(qKushkenos, (snapshotKushkenos) => {
        const kushkenosEvents = snapshotKushkenos.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TimelineEvent[];

        setEvents((prev) => {
          // Si ya hay eventos de ambas fuentes, combinamos y ordenamos
          const kushki = prev.filter(e => e.source === 'kushki-hitos');
          return sortEvents([...kushki, ...kushkenosEvents]);
        });
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

  function sortEvents(evts: TimelineEvent[]) {
    // Ordenar por fecha ascendente (YYYY-MM-DD)
    return [...evts].sort((a, b) => a.date.localeCompare(b.date));
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ date: true, name: true, description: true });
    if (!date || !name || !description) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    // Solo limpiar el error si todos los campos están completos
    if (error) setError('');
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
  name,
  description,
  imageUrl: imageUrl || null,
  created: Timestamp.now(),
});
      setDate('');
      setName('');
      setDescription('');
      setImage(null);
      setTouched({ date: false, name: false, description: false });
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
      <div className="timeline-fullwidth">
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
                    {event.name && (
                      <span className="event-name" style={{ fontWeight: 700, fontSize: '1.1em', color: cardStyle.color || undefined, marginBottom: 4 }}>{event.name}</span>
                    )}
                    <span className="event-desc" style={cardStyle}>{event.description}</span>
                  </div>
                ) : (
                  <div className="timeline-card timeline-card--bottom" style={cardStyle}>
                    <span className="event-date-label">{event.date}</span>
                    {event.name && (
                      <span className="event-name" style={{ fontWeight: 700, fontSize: '1.1em', color: cardStyle.color || undefined, marginBottom: 4 }}>{event.name}</span>
                    )}
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

      {/* Mensaje de error fijo arriba tipo toast */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            background: 'red',
            padding: '14px 36px',
            borderRadius: 10,
            zIndex: 9999,
            fontWeight: 'bold',
            boxShadow: '0 4px 24px #0007',
            fontSize: '1.15em',
            maxWidth: '90vw',
            textAlign: 'center',
            opacity: 0.97,
            letterSpacing: '0.5px',
            animation: 'fadeInDown 0.4s',
          }}
        >
          {error}
        </div>
      )}
      {/* Animación para el toast */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
          to { opacity: 0.97; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div className="event-form-footer">
        <form className="event-form" onSubmit={handleAddEvent} style={{marginBottom: 0}}>
          <input
            type="date"
            value={date}
            onChange={e => {
              setDate(e.target.value);
              setTouched(t => ({ ...t, date: true }));
              if (error && e.target.value && name && description) setError('');
            }}
            max={(() => {
              const today = new Date();
              return today.toISOString().split('T')[0];
            })()}
            style={{
              borderColor: touched.date && !date ? 'red' : undefined,
              outline: touched.date && !date ? '2px solid red' : undefined,
              marginBottom: 0,
            }}
          />
          <input
            type="text"
            placeholder="Nombre de la persona"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setTouched(t => ({ ...t, name: true }));
              if (error && date && e.target.value && description) setError('');
            }}
            style={{
              minWidth: 120,
              borderColor: touched.name && !name ? 'red' : undefined,
              outline: touched.name && !name ? '2px solid red' : undefined,
              marginBottom: 0,
            }}
          />
          <input
            type="text"
            placeholder="Descripción del evento"
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              setTouched(t => ({ ...t, description: true }));
              if (error && date && name && e.target.value) setError('');
            }}
            style={{
              borderColor: touched.description && !description ? 'red' : undefined,
              outline: touched.description && !description ? '2px solid red' : undefined,
              marginBottom: 0,
            }}
          />
          <label htmlFor="image-upload" style={{
            display: 'inline-block',
            padding: '0.5em 1em',
            borderRadius: 6,
            border: 'none',
            background: '#00FABF',
            color: '#00332A',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: 8,
            marginBottom: 0,
            fontSize: '1em',
            transition: 'background 0.2s',
          }}>
            Adjuntar imagen
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={e => setImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              style={{ display: 'none' }}
            />
          </label>
          {image && (
            <span style={{ color: '#333', fontSize: '0.95em', marginRight: 8 }}>{image.name}</span>
          )}
          <button
            type="submit"
            style={{
              padding: '0.5em 1em',
              borderRadius: 6,
              border: 'none',
              background: '#00FABF',
              color: '#00332A',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1em',
              transition: 'background 0.2s',
            }}
          >
            Agregar evento
          </button>
        </form>
      </div>
    </>
  );
}

export default App;
