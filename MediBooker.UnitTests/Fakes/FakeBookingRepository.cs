using MediBooker.Server.Models;
using MediBooker.Server.Services;

namespace MediBooker.UnitTests.Fakes;

public class FakeBookingRepository : IBookingRepository
{
    private readonly List<Booking> _bookings = [];
    private int _nextId = 1;

    public FakeBookingRepository(params Booking[] seed) => _bookings.AddRange(seed);

    public Booking? GetById(int id) =>
        _bookings.FirstOrDefault(b => b.Id == id);

    public IReadOnlyList<Booking> GetForRoom(int roomId, DateOnly date) =>
        _bookings.Where(b => b.RoomId == roomId && b.Date == date).ToList();

    public IReadOnlyList<Booking> GetForDoctor(string doctorId) =>
        _bookings.Where(b => b.DoctorId == doctorId).ToList();

    public void Add(Booking booking) => _bookings.Add(booking);

    // Booking is a reference type – mutation in CreateBooking/CancelBooking is already reflected.
    public void Update(Booking booking) { }

    public int NextId() => _nextId++;

    public IReadOnlyList<Booking> GetForDate(DateOnly date) =>
    _bookings.Where(b => b.Date == date).ToList();

}
