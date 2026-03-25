using MediBooker.Server.Services;

namespace MediBooker.UnitTests.Fakes;

public class FakeDateTimeProvider : IDateTimeProvider
{
    public DateOnly Today { get; }
    public TimeOnly Now   { get; }

    public FakeDateTimeProvider(DateOnly today, TimeOnly? now = null)
    {
        Today = today;
        Now   = now ?? new TimeOnly(12, 0);
    }
}
