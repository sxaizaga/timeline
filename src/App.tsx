
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
  source: 'kushki-hitos' | 'kushkenos-hitos';
};


function App() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

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
          source: 'kushkenos-hitos',
        })) as TimelineEvent[];
        setEvents((prev) => {
          // Si ya hay eventos de ambas fuentes, combinamos y ordenamos
          const kushki = prev.filter(e => e.source === 'kushki-hitos');
          return sortEvents([...kushki, ...kushkenosEvents]);
        });
      });
    } catch {
      setError('Configura tus credenciales de Firebase en src/firebase.ts');
    }
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
    if (!date || !description) return;
    try {
      await addDoc(collection(db, 'kushkenos-hitos'), {
        date,
        description,
        created: Timestamp.now(),
      });
      setDate('');
      setDescription('');
    } catch {
      setError('Error al guardar el evento. Revisa la configuración de Firebase.');
    }
  };

  // Paleta de colores legibles para kushkenos-hitos
  const kushkenosColors = [
    { bg: '#FFB300', text: '#222' }, // amarillo
    { bg: '#FF7043', text: '#fff' }, // naranja
    { bg: '#42A5F5', text: '#fff' }, // azul
    { bg: '#AB47BC', text: '#fff' }, // violeta
    { bg: '#66BB6A', text: '#fff' }, // verde
    { bg: '#EC407A', text: '#fff' }, // rosa
    { bg: '#8D6E63', text: '#fff' }, // marrón
  ];

  return (
    <>
      <div className="timeline-fullwidth">
        <ul className="timeline-list">
          {events.length === 0 && <li className="empty">No hay eventos aún.</li>}
          {events.map((event, idx) => {
            const isTop = idx % 2 === 1;
            // Colores según fuente
            let cardStyle = {};
            let dateStyle = {};
            let eventClass = '';
            if (event.source === 'kushki-hitos') {
              // Colores por defecto (turquesa)
              eventClass = '';
            } else {
              // Colores variados para kushkenos-hitos
              const color = kushkenosColors[idx % kushkenosColors.length];
              cardStyle = { background: color.bg, color: color.text };
              dateStyle = { background: color.bg, color: color.text };
              eventClass = ' kushkenos-event';
            }
            return (
              <li
                key={event.id || event.date + event.description}
                className={`timeline-event${isTop ? ' timeline-event--top' : ' timeline-event--bottom'}${eventClass}`}
              >
                <div className="timeline-node-wrapper">
                  <span className="event-date" style={dateStyle}></span>
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
          <button type="submit">Agregar evento</button>
        </form>
      </div>
    </>
  );
}

export default App;
