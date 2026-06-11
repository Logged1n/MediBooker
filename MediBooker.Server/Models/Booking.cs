namespace MediBooker.Server.Models;

public class Booking
{
    public int         Id       { get; private set; }
    public int         RoomId   { get; private set; }
    public string      DoctorId { get; private set; } = string.Empty;
    public TimeSlot    TimeSlot { get; private set; } = null!;
    public BookingStatus Status { get; private set; }
    
    public DateOnly Date      => TimeSlot.Date;
    public TimeOnly StartTime => TimeSlot.Start;
    public TimeOnly EndTime   => TimeSlot.End;

    private Booking() { }
    
    public static Booking Create(int id, int roomId, string doctorId, TimeSlot timeSlot)
        => new Booking
        {
            Id       = id,
            RoomId   = roomId,
            DoctorId = doctorId,
            TimeSlot = timeSlot,
            Status   = BookingStatus.Upcoming,
        };
    
    public static Booking Reconstitute(int id, int roomId, string doctorId,
        TimeSlot timeSlot, BookingStatus status)
        => new Booking
        {
            Id       = id,
            RoomId   = roomId,
            DoctorId = doctorId,
            TimeSlot = timeSlot,
            Status   = status,
        };
    
    public void Cancel(string requestingDoctorId)
    {
        if (DoctorId != requestingDoctorId)
            throw new UnauthorizedAccessException("You can only cancel your own bookings.");
        if (Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Booking is already cancelled.");
        if (Status == BookingStatus.Completed)
            throw new InvalidOperationException("Cannot cancel a completed booking.");

        Status = BookingStatus.Cancelled;
    }

    // Status obliczany przez domenę, nie przez kontroler HTTP
    public BookingStatus ComputeCurrentStatus(DateOnly today, TimeOnly now)
    {
        if (Status == BookingStatus.Cancelled)                return BookingStatus.Cancelled;
        if (TimeSlot.Date < today)                            return BookingStatus.Completed;
        if (TimeSlot.Date == today && now >= TimeSlot.End)    return BookingStatus.Completed;
        if (TimeSlot.Date == today && now >= TimeSlot.Start)  return BookingStatus.Active;
        return BookingStatus.Upcoming;
    }

    // Agregat sprawdza własne konflikty przez TimeSlot VO
    public bool ConflictsWith(TimeSlot other) => TimeSlot.OverlapsWith(other);
}
