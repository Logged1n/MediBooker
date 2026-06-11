namespace MediBooker.Server.Models;

public record TimeSlot
{
    public DateOnly Date  { get; }
    public TimeOnly Start { get; }
    public TimeOnly End   { get; }

    public TimeSlot(DateOnly date, TimeOnly start, TimeOnly end)
    {
        if (start >= end)
            throw new ArgumentException("Start time must be before end time.");
        Date  = date;
        Start = start;
        End   = end;
    }

    public TimeSpan Duration => End - Start;

    public bool OverlapsWith(TimeSlot other)
        => Date == other.Date && Start < other.End && End > other.Start;
}
