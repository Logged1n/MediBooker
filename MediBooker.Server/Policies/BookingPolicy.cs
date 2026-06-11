using MediBooker.Server.Models;

namespace MediBooker.Server.Policies;

public class BookingPolicy
{
    public static readonly TimeOnly WorkdayOpen  = new(8, 0);
    public static readonly TimeOnly WorkdayClose = new(20, 0);
    public static readonly TimeOnly BreakStart   = new(13, 0);
    public static readonly TimeOnly BreakEnd     = new(14, 0);
    public const int MinDurationMinutes = 15;
    public const int MaxDurationMinutes = 480;
    public const int MinLeadTimeMinutes = 60;
    
    public void Validate(TimeSlot slot, DateOnly today, TimeOnly now)
    {
        if (slot.Date < today)
            throw new ArgumentException("Booking date cannot be in the past.");

        var duration = slot.Duration.TotalMinutes;
        if (duration < MinDurationMinutes)
            throw new ArgumentException($"Booking must be at least {MinDurationMinutes} minutes long.");
        if (duration > MaxDurationMinutes)
            throw new ArgumentException($"Booking cannot exceed {MaxDurationMinutes / 60} hours.");

        if (slot.Date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
            || slot.Start < WorkdayOpen || slot.End > WorkdayClose)
            throw new ArgumentException("Bookings are only allowed on weekdays between 08:00 and 20:00.");

        if (!(slot.End <= BreakStart || slot.Start >= BreakEnd))
            throw new ArgumentException("Bookings cannot overlap with the maintenance break (13:00–14:00).");

        var bookingStart = slot.Date.ToDateTime(slot.Start);
        var current      = today.ToDateTime(now);
        if ((bookingStart - current).TotalMinutes < MinLeadTimeMinutes)
            throw new ArgumentException("Booking must be made at least 60 minutes in advance.");
    }
}
