using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public class InMemoryBookingRepository : IBookingRepository
{
    private readonly List<Booking> _bookings = [];
    private int _nextId = 1;

    public Booking? GetById(int id)
        => _bookings.FirstOrDefault(b => b.Id == id);

    public IReadOnlyList<Booking> GetForRoom(int roomId, DateOnly date)
        => _bookings.Where(b => b.RoomId == roomId && b.Date == date).ToList();

    public IReadOnlyList<Booking> GetForDoctor(string doctorId)
        => _bookings.Where(b => b.DoctorId == doctorId).ToList();

    public void Add(Booking booking) => _bookings.Add(booking);

    public void Update(Booking booking)
    {
        var idx = _bookings.FindIndex(b => b.Id == booking.Id);
        if (idx >= 0) _bookings[idx] = booking;
    }

    public int NextId() => _nextId++;

    public IReadOnlyList<Booking> GetForDate(DateOnly date)
        => _bookings.Where(b => b.Date == date).ToList();
}
