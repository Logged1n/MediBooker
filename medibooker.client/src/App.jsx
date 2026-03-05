import { useState } from 'react';
import './App.css';

const mockRooms = [
  { id: 1, name: 'Room 101', type: 'Examination', floor: 1, available: true },
  { id: 2, name: 'Room 203', type: 'Surgery', floor: 2, available: false },
  { id: 3, name: 'Room 115', type: 'Consultation', floor: 1, available: true },
  { id: 4, name: 'Room 302', type: 'Radiology', floor: 3, available: true },
  { id: 5, name: 'Room 210', type: 'ICU', floor: 2, available: false },
  { id: 6, name: 'Room 118', type: 'Consultation', floor: 1, available: true },
];

const mockBookings = [
  { id: 1, room: 'Room 203', doctor: 'Dr. Kowalski', date: '2026-03-05', time: '09:00 – 10:00', status: 'active' },
  { id: 2, room: 'Room 210', doctor: 'Dr. Nowak', date: '2026-03-05', time: '11:00 – 12:30', status: 'active' },
  { id: 3, room: 'Room 101', doctor: 'Dr. Wiśniewska', date: '2026-03-04', time: '14:00 – 15:00', status: 'completed' },
  { id: 4, room: 'Room 115', doctor: 'Dr. Kowalski', date: '2026-03-06', time: '08:00 – 09:00', status: 'upcoming' },
];

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
        <span className="user-name">Dr. Kowalski</span>
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
          {room.available ? 'Available' : 'Occupied'}
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

function BookingRow({ booking }) {
  const statusClass = {
    active: 'status-active',
    completed: 'status-completed',
    upcoming: 'status-upcoming',
  }[booking.status];

  return (
    <tr className="booking-row">
      <td>{booking.room}</td>
      <td>{booking.doctor}</td>
      <td>{booking.date}</td>
      <td>{booking.time}</td>
      <td><span className={`status-badge ${statusClass}`}>{booking.status}</span></td>
      <td>
        {booking.status !== 'completed' && (
          <button className="btn-cancel">Cancel</button>
        )}
      </td>
    </tr>
  );
}

function BookingModal({ room, onClose }) {
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }

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
            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
              <button type="submit" className="btn-confirm">Confirm Booking</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Dashboard({ onBook }) {
  const available = mockRooms.filter((r) => r.available).length;
  const occupied = mockRooms.length - available;
  const myBookings = mockBookings.filter((b) => b.doctor === 'Dr. Kowalski').length;

  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Welcome back, Dr. Kowalski. Here's today's overview.</p>
      </div>

      <div className="stats-row">
        <StatCard icon="🟢" label="Available Rooms" value={available} accent="accent-green" />
        <StatCard icon="🔴" label="Occupied Rooms" value={occupied} accent="accent-red" />
        <StatCard icon="📅" label="My Bookings" value={myBookings} accent="accent-blue" />
        <StatCard icon="🏥" label="Total Rooms" value={mockRooms.length} accent="accent-purple" />
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Available Rooms</h2>
          <span className="section-count">{available} available</span>
        </div>
        <div className="rooms-grid">
          {mockRooms.filter((r) => r.available).map((room) => (
            <RoomCard key={room.id} room={room} onBook={onBook} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Recent Bookings</h2>
        </div>
        <div className="table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockBookings.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RoomsPage({ onBook }) {
  const [filter, setFilter] = useState('all');
  const filtered = mockRooms.filter((r) =>
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
      <div className="rooms-grid rooms-grid-full">
        {filtered.map((room) => (
          <RoomCard key={room.id} room={room} onBook={onBook} />
        ))}
      </div>
    </div>
  );
}

function MyBookingsPage() {
  const mine = mockBookings.filter((b) => b.doctor === 'Dr. Kowalski');
  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>My Bookings</h1>
        <p>Manage your reservations.</p>
      </div>
      <div className="table-wrapper">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPage() {
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
        <div className="table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockBookings.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [bookingRoom, setBookingRoom] = useState(null);

  const pages = {
    Dashboard: <Dashboard onBook={setBookingRoom} />,
    Rooms: <RoomsPage onBook={setBookingRoom} />,
    'My Bookings': <MyBookingsPage />,
    Admin: <AdminPage />,
  };

  return (
    <div className="app">
      <Navbar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="main-content">
        {pages[activeNav]}
      </main>
      {bookingRoom && (
        <BookingModal room={bookingRoom} onClose={() => setBookingRoom(null)} />
      )}
    </div>
  );
}
