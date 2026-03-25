import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api, Room, Booking, Slot } from './api';

interface CurrentUser {
  doctorId: string;
  displayName: string;
  role: string;
}

const roomTypeIcon: Record<string, string> = {
  Examination: '\u{1F52C}',
  Surgery: '\u{1F3E5}',
  Consultation: '\u{1F4AC}',
  Radiology: '\u{1F4E1}',
  ICU: '\u2764\uFE0F',
};

function LoginPage({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      onLogin({ doctorId: res.doctorId, displayName: res.displayName, role: res.role });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (showRegister) {
    return (
      <RegisterPage
        onRegistered={(user) => onLogin(user)}
        onBack={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">🏥</span>
          <span className="brand-name" data-testid="brand-name-login">MediBooker</span>
        </div>
        <h2 className="auth-title">Sign In</h2>
        {error && <div className="auth-error" data-testid="login-error">{error}</div>}
        <form className="auth-form" data-testid="login-form" onSubmit={handleLogin}>
          <label>
            Username
            <input
              type="text"
              data-testid="input-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              data-testid="input-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-auth" data-testid="btn-login" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">
          No account?{' '}
          <button className="link-btn" data-testid="btn-go-register" onClick={() => setShowRegister(true)}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterPage({
  onRegistered,
  onBack,
}: {
  onRegistered: (user: CurrentUser) => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Doctor');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.register(username, password, displayName, role);
      localStorage.setItem('token', res.token);
      onRegistered({ doctorId: res.doctorId, displayName: res.displayName, role: res.role });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">🏥</span>
          <span className="brand-name">MediBooker</span>
        </div>
        <h2 className="auth-title">Create Account</h2>
        {error && <div className="auth-error" data-testid="register-error">{error}</div>}
        <form className="auth-form" data-testid="register-form" onSubmit={handleRegister}>
          <label>
            Display Name
            <input
              type="text"
              data-testid="input-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Username
            <input
              type="text"
              data-testid="input-reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              data-testid="input-reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Role
            <select data-testid="select-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="btn-auth" data-testid="btn-register" disabled={submitting}>
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button className="link-btn" onClick={onBack}>Sign In</button>
        </p>
      </div>
    </div>
  );
}

function Navbar({
  activeNav,
  setActiveNav,
  currentUser,
  onLogout,
}: {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  currentUser: CurrentUser;
  onLogout: () => void;
}) {
  return (
    <nav className="navbar" data-testid="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🏥</span>
        <span className="brand-name" data-testid="brand-name">MediBooker</span>
      </div>
      <div className="navbar-links">
        {['Dashboard', 'Rooms', 'My Bookings', 'Admin'].map((item) => (
          <button
            key={item}
            className={`nav-link ${activeNav === item ? 'active' : ''}`}
            data-testid={`nav-${item.toLowerCase().replace(' ', '-')}`}
            onClick={() => setActiveNav(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="navbar-user">
        <span className="user-avatar">👤</span>
        <span className="user-name" data-testid="user-name">{currentUser.displayName}</span>
        <span className="user-role">{currentUser.role}</span>
        <button className="btn-logout" data-testid="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  testId,
}: {
  icon: string;
  label: string;
  value: number;
  accent: string;
  testId: string;
}) {
  return (
    <div className={`stat-card ${accent}`} data-testid={testId}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function RoomCard({ room, onBook }: { room: Room; onBook: (room: Room) => void }) {
  return (
    <div className={`room-card ${room.available ? 'available' : 'occupied'}`} data-testid="room-card">
      <div className="room-header">
        <span className="room-type-icon">{roomTypeIcon[room.type] ?? '🚪'}</span>
        <span
          className={`room-status-badge ${room.available ? 'badge-available' : 'badge-occupied'}`}
          data-testid="room-status"
        >
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
        data-testid="btn-book"
        disabled={!room.available}
        onClick={() => room.available && onBook(room)}
      >
        {room.available ? 'Book Room' : 'Unavailable'}
      </button>
    </div>
  );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: (id: number) => void }) {
  const statusClass =
    ({
      active: 'status-active',
      completed: 'status-completed',
      upcoming: 'status-upcoming',
      cancelled: 'status-cancelled',
    } as Record<string, string>)[booking.status] ?? '';

  return (
    <tr className="booking-row" data-testid="booking-row">
      <td>{booking.roomName}</td>
      <td>{booking.doctorId}</td>
      <td>{booking.date}</td>
      <td>{booking.startTime} - {booking.endTime}</td>
      <td><span className={`status-badge ${statusClass}`}>{booking.status}</span></td>
      <td>
        {(booking.status === 'upcoming' || booking.status === 'active') && (
          <button className="btn-cancel" data-testid="btn-cancel" onClick={() => onCancel(booking.id)}>
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
}

function BookingModal({
  room,
  onClose,
  onBooked,
}: {
  room: Room;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    api
      .getAvailableSlots(room.id, date, 60)
      .then((s) => setSlots(s ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [date, room.id]);

  async function handleSubmit(e: React.FormEvent) {
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
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" data-testid="booking-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="modal-success" data-testid="booking-success">
            <div className="success-icon">✅</div>
            <div>Booking confirmed!</div>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Book {room.name}</h2>
              <button className="modal-close" onClick={onClose}>x</button>
            </div>
            <div className="modal-room-info">
              <span>{roomTypeIcon[room.type]} {room.type}</span>
              <span>Floor {room.floor}</span>
            </div>
            {error && (
              <div className="booking-error" data-testid="booking-error">
                {error}
              </div>
            )}
            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Date
                <input
                  type="date"
                  data-testid="input-date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              {date && (
                <div className="slots-section">
                  {loadingSlots ? (
                    <p className="slots-loading">Loading available slots...</p>
                  ) : slots.length > 0 ? (
                    <div>
                      <p className="slots-label">Available time slots:</p>
                      <div className="slots-list" data-testid="slots-list">
                        {slots.map((slot) => (
                          <button
                            key={`${slot.start}-${slot.end}`}
                            type="button"
                            className={`slot-btn${timeFrom === slot.start && timeTo === slot.end ? ' slot-selected' : ''}`}
                            data-testid="slot-btn"
                            onClick={() => {
                              setTimeFrom(slot.start);
                              setTimeTo(slot.end);
                            }}
                          >
                            {slot.start} - {slot.end}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="slots-empty">No available slots for this date.</p>
                  )}
                </div>
              )}

              <div className="time-row">
                <label>
                  From
                  <input
                    type="time"
                    data-testid="input-time-from"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    required
                  />
                </label>
                <label>
                  To
                  <input
                    type="time"
                    data-testid="input-time-to"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                className="btn-confirm"
                data-testid="btn-confirm-booking"
                disabled={submitting}
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function BookingsTable({
  bookings,
  loading,
  onCancel,
  showCancel = true,
}: {
  bookings: Booking[];
  loading: boolean;
  onCancel?: (id: number) => void;
  showCancel?: boolean;
}) {
  if (loading) return <p style={{ color: '#888', padding: '1rem' }}>Loading...</p>;
  return (
    <div className="table-wrapper">
      <table className="bookings-table" data-testid="bookings-table">
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

function Dashboard({
  rooms,
  todayBookings,
  onBook,
  loading,
  currentUser,
}: {
  rooms: Room[];
  todayBookings: Booking[];
  onBook: (room: Room) => void;
  loading: boolean;
  currentUser: CurrentUser;
}) {
  const available = rooms.filter((r) => r.available).length;
  const occupied = rooms.length - available;
  const myCount = todayBookings.filter((b) => b.doctorId === currentUser.doctorId).length;

  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Welcome back, {currentUser.displayName}. Here&apos;s today&apos;s overview.</p>
      </div>
      <div className="stats-row">
        <StatCard icon="🟢" label="Available Rooms" value={available} accent="accent-green" testId="stat-available" />
        <StatCard icon="🔴" label="Occupied Rooms" value={occupied} accent="accent-red" testId="stat-occupied" />
        <StatCard icon="📅" label="My Bookings Today" value={myCount} accent="accent-blue" testId="stat-my-bookings" />
        <StatCard icon="🏥" label="Total Rooms" value={rooms.length} accent="accent-purple" testId="stat-total" />
      </div>
      <section className="section">
        <div className="section-header">
          <h2>Available Rooms</h2>
          <span className="section-count">{available} available</span>
        </div>
        {loading ? (
          <p style={{ color: '#888', padding: '1rem' }}>Loading rooms...</p>
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

function RoomsPage({
  rooms,
  onBook,
  loading,
}: {
  rooms: Room[];
  onBook: (room: Room) => void;
  loading: boolean;
}) {
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
            data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ color: '#888', padding: '1rem' }}>Loading rooms...</p>
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

function MyBookingsPage({
  bookings,
  onCancel,
  loading,
}: {
  bookings: Booking[];
  onCancel: (id: number) => void;
  loading: boolean;
}) {
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

function AdminPage({
  allBookings,
  onCancel,
  loading,
}: {
  allBookings: Booking[];
  onCancel: (id: number) => void;
  loading: boolean;
}) {
  return (
    <div className="dashboard">
      <div className="page-title">
        <h1>Admin Panel</h1>
        <p>Manage rooms and view all reservations.</p>
      </div>
      <div className="admin-grid" data-testid="admin-grid">
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('currentUser');
    if (token && stored) {
      try {
        return JSON.parse(stored) as CurrentUser;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeNav, setActiveNav] = useState('Dashboard');
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      setRooms(await api.getRooms());
    } catch (e) {
      console.error('Failed to load rooms', e);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchMyBookings = useCallback(async () => {
    setLoadingMyBookings(true);
    try {
      setMyBookings(await api.getMyBookings());
    } catch (e) {
      console.error('Failed to load my bookings', e);
    } finally {
      setLoadingMyBookings(false);
    }
  }, []);

  const fetchTodayBookings = useCallback(async () => {
    setLoadingAll(true);
    try {
      setTodayBookings(await api.getAllBookings(today));
    } catch (e) {
      console.error('Failed to load today bookings', e);
    } finally {
      setLoadingAll(false);
    }
  }, [today]);

  useEffect(() => {
    if (!currentUser) return;
    fetchRooms();
    fetchTodayBookings();
  }, [currentUser, fetchRooms, fetchTodayBookings]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeNav === 'My Bookings') fetchMyBookings();
    if (activeNav === 'Admin') fetchTodayBookings();
  }, [activeNav, currentUser, fetchMyBookings, fetchTodayBookings]);

  function handleLogin(user: CurrentUser) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    setActiveNav('Dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setRooms([]);
    setMyBookings([]);
    setTodayBookings([]);
  }

  async function handleCancel(id: number) {
    try {
      await api.cancelBooking(id);
      fetchMyBookings();
      fetchTodayBookings();
    } catch (e) {
      alert(`Cancel failed: ${(e as Error).message}`);
    }
  }

  function handleBooked() {
    fetchMyBookings();
    fetchTodayBookings();
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const pages: Record<string, React.ReactNode> = {
    Dashboard: (
      <Dashboard
        rooms={rooms}
        todayBookings={todayBookings}
        onBook={setBookingRoom}
        loading={loadingRooms || loadingAll}
        currentUser={currentUser}
      />
    ),
    Rooms: <RoomsPage rooms={rooms} onBook={setBookingRoom} loading={loadingRooms} />,
    'My Bookings': (
      <MyBookingsPage bookings={myBookings} onCancel={handleCancel} loading={loadingMyBookings} />
    ),
    Admin: (
      <AdminPage allBookings={todayBookings} onCancel={handleCancel} loading={loadingAll} />
    ),
  };

  return (
    <div className="app">
      <Navbar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {pages[activeNav]}
      </main>
      {bookingRoom && (
        <BookingModal room={bookingRoom} onClose={() => setBookingRoom(null)} onBooked={handleBooked} />
      )}
    </div>
  );
}
