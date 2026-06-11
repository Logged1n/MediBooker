using MediBooker.Server.Models;
using MediBooker.Server.Policies;

namespace MediBooker.Server.Services;

public class BookingService
{
    private readonly IBookingRepository _bookingRepo;
    private readonly IRoomRepository    _roomRepo;
    private readonly IDateTimeProvider  _dateTime;
    private readonly BookingPolicy      _policy;

    public BookingService(
        IBookingRepository bookingRepo,
        IRoomRepository    roomRepo,
        IDateTimeProvider  dateTime,
        BookingPolicy      policy)
    {
        _bookingRepo = bookingRepo;
        _roomRepo    = roomRepo;
        _dateTime    = dateTime;
        _policy      = policy;
    }

    public Booking CreateBooking(CreateBookingRequest request)
    {
        var room = _roomRepo.GetById(request.RoomId)
            ?? throw new KeyNotFoundException($"Room {request.RoomId} not found.");

        if (!room.IsActive)
            throw new InvalidOperationException("Cannot book an inactive room.");

        // TimeSlot VO — walidacja Start < End wewnątrz konstruktora
        var timeSlot = new TimeSlot(request.Date, request.StartTime, request.EndTime);

        // BookingPolicy zamiast trzech osobnych walidatorów
        _policy.Validate(timeSlot, _dateTime.Today, _dateTime.Now);

        // Metoda domenowa agregatu — ConflictsWith używa TimeSlot.OverlapsWith
        var hasConflict = _bookingRepo
            .GetForRoom(request.RoomId, request.Date)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .Any(b => b.ConflictsWith(timeSlot));

        if (hasConflict)
            throw new InvalidOperationException("The room is already booked for this time slot.");

        // Fabryka zamiast new Booking { ... } z publicznymi setterami
        var booking = Booking.Create(
            _bookingRepo.NextId(), request.RoomId,
            request.DoctorId ?? string.Empty, timeSlot);

        _bookingRepo.Add(booking);
        return booking;
    }

    public void CancelBooking(int bookingId, string requestingDoctorId)
    {
        var booking = _bookingRepo.GetById(bookingId)
            ?? throw new KeyNotFoundException($"Booking {bookingId} not found.");

        // Reguły anulowania należą do agregatu, nie do serwisu
        booking.Cancel(requestingDoctorId);
        _bookingRepo.Update(booking);
    }

    public IReadOnlyList<Booking> GetDoctorBookings(string doctorId)
        => _bookingRepo.GetForDoctor(doctorId);

    public IReadOnlyList<Booking> GetRoomSchedule(int roomId, DateOnly date)
    {
        _ = _roomRepo.GetById(roomId)
            ?? throw new KeyNotFoundException($"Room {roomId} not found.");

        return _bookingRepo
            .GetForRoom(roomId, date)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .OrderBy(b => b.StartTime)
            .ToList();
    }

    public IReadOnlyList<(TimeOnly Start, TimeOnly End)> GetAvailableSlots(
        int roomId, DateOnly date, int slotDurationMinutes)
    {
        _ = _roomRepo.GetById(roomId)
            ?? throw new KeyNotFoundException($"Room {roomId} not found.");

        if (slotDurationMinutes <= 0)
            throw new ArgumentException("Slot duration must be greater than 0.");

        var booked = _bookingRepo
            .GetForRoom(roomId, date)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .ToList();

        var available = new List<(TimeOnly Start, TimeOnly End)>();
        var slotStart = BookingPolicy.WorkdayOpen;

        while (slotStart.ToTimeSpan().Add(TimeSpan.FromMinutes(slotDurationMinutes)) <= BookingPolicy.WorkdayClose.ToTimeSpan())
        {
            var slotEnd   = slotStart.AddMinutes(slotDurationMinutes);
            var candidate = new TimeSlot(date, slotStart, slotEnd);

            var isOccupied          = booked.Any(b => b.ConflictsWith(candidate));
            var overlapsMaintenance = !(slotEnd   <= BookingPolicy.BreakStart
                                     || slotStart >= BookingPolicy.BreakEnd);

            if (!isOccupied && !overlapsMaintenance)
                available.Add((slotStart, slotEnd));

            slotStart = slotStart.AddMinutes(slotDurationMinutes);
        }

        return available;
    }

    public IReadOnlyList<Booking> GetAllBookingsForDate(DateOnly date)
        => _bookingRepo
            .GetForDate(date)
            .OrderBy(b => b.StartTime)
            .ToList();
}
