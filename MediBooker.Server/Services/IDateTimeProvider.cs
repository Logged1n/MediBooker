namespace MediBooker.Server.Services;

public interface IDateTimeProvider
{
    DateOnly Today { get; }
    TimeOnly Now { get; }
}
