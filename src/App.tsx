
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
    <div className="timeline-container">
      <h1>Línea de Tiempo Interactiva</h1>
      {error && <div style={{color: 'red', marginBottom: 10}}>{error}</div>}
      <form className="event-form" onSubmit={handleAddEvent}>
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
      <ul className="timeline-list">
        {events.length === 0 && <li className="empty">No hay eventos aún.</li>}
        {events.map((event) => (
          <li key={event.id || event.date + event.description} className="timeline-event">
            <span className="event-date">{event.date}</span>
            <span className="event-desc">{event.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
