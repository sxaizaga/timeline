
import { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';

type TimelineEvent = {
  id?: string;
  date: string;
  description: string;
};


function App() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    // Escuchar cambios en tiempo real
    try {
      const q = query(collection(db, 'events'), orderBy('date'));
      const unsub = onSnapshot(q, (snapshot) => {
        setEvents(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as TimelineEvent[]
        );
      });
      return () => unsub();
    } catch (e) {
      setError('Configura tus credenciales de Firebase en src/firebase.ts');
    }
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description) return;
    try {
      await addDoc(collection(db, 'events'), {
        date,
        description,
        created: Timestamp.now(),
      });
      setDate('');
      setDescription('');
    } catch (e) {
      setError('Error al guardar el evento. Revisa la configuración de Firebase.');
    }
  };

  return (
    <>
      <div className="timeline-fullwidth">
        <ul className="timeline-list">
          {events.length === 0 && <li className="empty">No hay eventos aún.</li>}
          {events.map((event, idx) => {
            const isTop = idx % 2 === 1;
            return (
              <li
                key={event.id || event.date + event.description}
                className={`timeline-event${isTop ? ' timeline-event--top' : ' timeline-event--bottom'}`}
              >
                <div className="timeline-node-wrapper"><span className="event-date"></span></div>
                {isTop ? (
                  <div className="timeline-card timeline-card--top">
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc">{event.description}</span>
                  </div>
                ) : (
                  <div className="timeline-card timeline-card--bottom">
                    <span className="event-date-label">{event.date}</span>
                    <span className="event-desc">{event.description}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="event-form-footer">
        {error && <div style={{color: 'red', marginBottom: 10}}>{error}</div>}
        {showForm && (
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
            <button
              type="button"
              className="close-form-btn"
              aria-label="Cerrar"
              style={{
                marginLeft: 8,
                background: '#fff',
                color: '#00FABF',
                border: '1px solid #00FABF',
                borderRadius: 6,
                padding: '0.5em 1em',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export default App;
