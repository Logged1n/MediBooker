namespace MediBooker.Server.Services;

public class DateTimeProvider : IDateTimeProvider
{
    public DateOnly Today => DateOnly.FromDateTime(DateTime.Today);
}
