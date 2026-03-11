import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api, CURRENT_DOCTOR_NAME, CURRENT_DOCTOR_ID } from './api';

const roomTypeIcon = {
  Examination: '🔬',
  Surgery: '🏥',
  Consultation: '💬',
  Radiology: '📡',
  ICU: '❤️',
};

function Navbar({ activeNav, setActiveNav }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🏥</span>
        <span className="brand-name">MediBooker</span>
      </div>
      <div className="navbar-links">
        {['Dashboard', 'Rooms', 'My Bookings', 'Admin'].map((item) => (
          <button
            key={item}
            className={`nav-link ${activeNav === item ? 'active' : ''}`}
            onClick={() => setActiveNav(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="navbar-user">
        <span className="user-avatar">👤</span>
        <span className="user-name">{CURRENT_DOCTOR_NAME}</span>
        <span className="user-role">Doctor</span>
      </div>
    </nav>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function RoomCard({ room, onBook }) {
  return (
    <div className={`room-card ${room.available ? 'available' : 'occupied'}`}>
      <div className="room-header">
        <span className="room-type-icon">{roomTypeIcon[room.type] || '🚪'}</span>
        <span className={`room-status-badge ${room.available ? 'badge-available' : 'badge-occupied'}`}>
          {room.available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <div className="room-name">{room.name}</div>
      <div className="room-meta">
        <span>Type: {room.type}</span>
        <span>Floor {room.floor}</span>
      </div>
      <button
        className={`room-action-btn ${room.available ? 'btn-book' : 'btn-disabled'}`}
        disabled={!room.available}
        onClick={() => room.available && onBook(room)}
      >
        {room.available ? 'Book Room' : 'Unavailable'}
      </button>
    </div>
  );
}

function BookingRow({ booking, onCancel }) {
  const statusClass = {
    active: 'status-active',
    completed: 'status-completed',
    upcoming: 'status-upcoming',
    cancelled: 'status-cancelled',
  }[booking.status] ?? '';

  return (
    <tr className="booking-row">
      <td>{booking.roomName}</td>
      <td>{booking.doctorId}</td>
      <td>{booking.date}</td>
      <td>{booking.startTime} – {booking.endTime}</td>
      <td><span className={`status-badge ${statusClass}`}>{booking.status}</span></td>
      <td>
        {(booking.status === 'upcoming' || booking.status === 'active') && (
          <button className="btn-cancel" onClick={() => onCancel(booking.id)}>Cancel</button>
        )}
      </td>
    </tr>
  );
}

function BookingModal({ room, onClose, onBooked }) {
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createBooking({ roomId: room.id, date, startTime: timeFrom, endTime: timeTo });
      setSubmitted(true);
      setTimeout(() => {
        onBooked();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="modal-success">
            <div className="success-icon">✅</div>
            <div>Booking confirmed!</div>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Book {room.name}</h2>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-room-info">
              <span>{roomTypeIcon[room.type]} {room.type}</span>
              <span>Floor {room.floor}</span>
            </div>
            {error && (
              <div style={{ color: '#e53e3e', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Date
                <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <div className="time-row">
                <label>
                  From
                  <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} required />
                </label>
                <label>
                  To
                  <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} required />
                </label>
              </div>
              <button type="submit" className="btn-confirm" disabled={submitting}>
                {submitting ? 'Booking…' : 'Confirm Booking'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function BookingsTable({ bookings, loading, onCancel, showCancel = true }) {
  if (loading) return <p style={{ color: '#888', padding: '1rem' }}>Loading…</p>;
  return (
    <div className="table-wrapper">
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Doctor</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            {showCancel && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={showCancel ? 6 : 5} style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>
                No bookings found.
              </td>
            </tr>
          ) : (
            bookings.map((b) => (
              <BookingRow key={b.id} booking={b} onCancel={onCancel ?? (() => {})} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ rooms, todayBookings, onBook, loading }) {
  const available = rooms.filter((r) => r.available).length;
  const occupied = rooms.length - available;
  const myCount = todayBookings.filter((b) => b.doctorId === CURRENT_DOCTOR_ID).length;

  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Welcome back, {CURRENT_DOCTOR_NAME}. Here&apos;s today&apos;s overview.</p>
      </div>
      <div className="stats-row">
        <StatCard icon="🟢" label="Available Rooms" value={available} accent="accent-green" />
        <StatCard icon="🔴" label="Occupied Rooms" value={occupied} accent="accent-red" />
        <StatCard icon="📅" label="My Bookings Today" value={myCount} accent="accent-blue" />
        <StatCard icon="🏥" label="Total Rooms" value={rooms.length} accent="accent-purple" />
      </div>
      <section className="section">
        <div className="section-header">
          <h2>Available Rooms</h2>
          <span className="section-count">{available} available</span>
        </div>
        {loading ? (
          <p style={{ color: '#888', padding: '1rem' }}>Loading rooms…</p>
        ) : (
          <div className="rooms-grid">
            {rooms.filter((r) => r.available).map((room) => (
              <RoomCard key={room.id} room={room} onBook={onBook} />
            ))}
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-header"><h2>Today&apos;s Bookings</h2></div>
        <BookingsTable bookings={todayBookings} loading={loading} showCancel={false} />
      </section>
    </div>
  );
}

function RoomsPage({ rooms, onBook, loading }) {
  const [filter, setFilter] = useState('all');
  const filtered = rooms.filter((r) =>
    filter === 'all' ? true : filter === 'available' ? r.available : !r.available
  );

  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Medical Rooms</h1>
        <p>Browse and book available rooms.</p>
      </div>
      <div className="filter-bar">
        {['all', 'available', 'occupied'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ color: '#888', padding: '1rem' }}>Loading rooms…</p>
      ) : (
        <div className="rooms-grid rooms-grid-full">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} onBook={onBook} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyBookingsPage({ bookings, onCancel, loading }) {
  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>My Bookings</h1>
        <p>Manage your reservations.</p>
      </div>
      <BookingsTable bookings={bookings} loading={loading} onCancel={onCancel} showCancel />
    </div>
  );
}

function AdminPage({ allBookings, onCancel, loading }) {
  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Admin Panel</h1>
        <p>Manage rooms and view all reservations.</p>
      </div>
      <div className="admin-grid">
        <div className="admin-card">
          <div className="admin-card-icon">🏥</div>
          <div className="admin-card-title">Manage Rooms</div>
          <div className="admin-card-desc">Add, edit, and remove medical rooms from the system.</div>
          <button className="btn-admin">Open</button>
        </div>
        <div className="admin-card">
          <div className="admin-card-icon">📅</div>
          <div className="admin-card-title">All Reservations</div>
          <div className="admin-card-desc">View and manage all bookings across the facility.</div>
          <button className="btn-admin">Open</button>
        </div>
        <div className="admin-card">
          <div className="admin-card-icon">👥</div>
          <div className="admin-card-title">User Management</div>
          <div className="admin-card-desc">Manage doctor accounts and access permissions.</div>
          <button className="btn-admin">Open</button>
        </div>
        <div className="admin-card">
          <div className="admin-card-icon">📊</div>
          <div className="admin-card-title">Reports</div>
          <div className="admin-card-desc">View usage statistics and scheduling analytics.</div>
          <button className="btn-admin">Open</button>
        </div>
      </div>
      <section className="section">
        <div className="section-header"><h2>All Reservations</h2></div>
        <BookingsTable bookings={allBookings} loading={loading} onCancel={onCancel} showCancel />
      </section>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [bookingRoom, setBookingRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try { setRooms(await api.getRooms()); }
    catch (e) { console.error('Failed to load rooms', e); }
    finally { setLoadingRooms(false); }
  }, []);

  const fetchMyBookings = useCallback(async () => {
    setLoadingMyBookings(true);
    try { setMyBookings(await api.getMyBookings()); }
    catch (e) { console.error('Failed to load my bookings', e); }
    finally { setLoadingMyBookings(false); }
  }, []);

  const fetchTodayBookings = useCallback(async () => {
    setLoadingAll(true);
    try { setTodayBookings(await api.getAllBookings(today)); }
    catch (e) { console.error('Failed to load today bookings', e); }
    finally { setLoadingAll(false); }
  }, [today]);

  useEffect(() => {
    fetchRooms();
    fetchTodayBookings();
  }, [fetchRooms, fetchTodayBookings]);

  useEffect(() => {
    if (activeNav === 'My Bookings') fetchMyBookings();
    if (activeNav === 'Admin') fetchTodayBookings();
  }, [activeNav, fetchMyBookings, fetchTodayBookings]);

  async function handleCancel(id) {
    try {
      await api.cancelBooking(id);
      fetchMyBookings();
      fetchTodayBookings();
    } catch (e) {
      alert(`Cancel failed: ${e.message}`);
    }
  }

  function handleBooked() {
    fetchMyBookings();
    fetchTodayBookings();
  }

  const pages = {
    Dashboard: (
      <Dashboard rooms={rooms} todayBookings={todayBookings} onBook={setBookingRoom} loading={loadingRooms || loadingAll} />
    ),
    Rooms: (
      <RoomsPage rooms={rooms} onBook={setBookingRoom} loading={loadingRooms} />
    ),
    'My Bookings': (
      <MyBookingsPage bookings={myBookings} onCancel={handleCancel} loading={loadingMyBookings} />
    ),
    Admin: (
      <AdminPage allBookings={todayBookings} onCancel={handleCancel} loading={loadingAll} />
    ),
  };

  return (
    <div className="app">
      <Navbar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="main-content">
        {pages[activeNav]}
      </main>
      {bookingRoom && (
        <BookingModal room={bookingRoom} onClose={() => setBookingRoom(null)} onBooked={handleBooked} />
      )}
    </div>
  );
}
