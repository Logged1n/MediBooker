using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public class BookingService
{
    private const int MinDurationMinutes = 15;
    private const int MaxDurationMinutes = 480; // 8 hours

    private readonly IBookingRepository _bookingRepo;
    private readonly IRoomRepository _roomRepo;
    private readonly IDateTimeProvider _dateTime;

    public BookingService(
        IBookingRepository bookingRepo,
        IRoomRepository roomRepo,
        IDateTimeProvider dateTime)
    {
        _bookingRepo = bookingRepo;
        _roomRepo    = roomRepo;
        _dateTime    = dateTime;
    }

    public Booking CreateBooking(CreateBookingRequest request)
    {
        var room = _roomRepo.GetById(request.RoomId)
            ?? throw new KeyNotFoundException($"Room {request.RoomId} not found.");

        if (!room.IsActive)
            throw new InvalidOperationException("Cannot book an inactive room.");

        if (request.StartTime >= request.EndTime)
            throw new ArgumentException("Start time must be before end time.");

        if (request.Date < _dateTime.Today)
            throw new ArgumentException("Booking date cannot be in the past.");

        var durationMinutes = (request.EndTime - request.StartTime).TotalMinutes;

        if (durationMinutes < MinDurationMinutes)
            throw new ArgumentException($"Booking must be at least {MinDurationMinutes} minutes long.");

        if (durationMinutes > MaxDurationMinutes)
            throw new ArgumentException($"Booking cannot exceed {MaxDurationMinutes / 60} hours.");

        var hasConflict = _bookingRepo
            .GetForRoom(request.RoomId, request.Date)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .Any(b => request.StartTime < b.EndTime && request.EndTime > b.StartTime);

        if (hasConflict)
            throw new InvalidOperationException("The room is already booked for this time slot.");

        var booking = new Booking
        {
            Id        = _bookingRepo.NextId(),
            RoomId    = request.RoomId,
            DoctorId  = request.DoctorId,
            Date      = request.Date,
            StartTime = request.StartTime,
            EndTime   = request.EndTime,
            Status    = BookingStatus.Upcoming,
        };

        _bookingRepo.Add(booking);
        return booking;
    }

    public void CancelBooking(int bookingId, string requestingDoctorId)
    {
        var booking = _bookingRepo.GetById(bookingId)
            ?? throw new KeyNotFoundException($"Booking {bookingId} not found.");

        if (booking.DoctorId != requestingDoctorId)
            throw new UnauthorizedAccessException("You can only cancel your own bookings.");

        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Booking is already cancelled.");

        if (booking.Status == BookingStatus.Completed)
            throw new InvalidOperationException("Cannot cancel a completed booking.");

        booking.Status = BookingStatus.Cancelled;
        _bookingRepo.Update(booking);
    }

    public IReadOnlyList<Booking> GetDoctorBookings(string doctorId)
        => _bookingRepo.GetForDoctor(doctorId);

    public IReadOnlyList<Booking> GetRoomSchedule(int roomId, DateOnly date)
    {
        var room = _roomRepo.GetById(roomId)
            ?? throw new KeyNotFoundException($"Room {roomId} not found.");

        return _bookingRepo
            .GetForRoom(roomId, date)
            .Where(b => b.Status != BookingStatus.Cancelled)
            .OrderBy(b => b.StartTime)
            .ToList();
    }
}
