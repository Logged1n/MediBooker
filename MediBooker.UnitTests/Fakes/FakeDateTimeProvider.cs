using MediBooker.Server.Services;

namespace MediBooker.UnitTests.Fakes;

public class FakeDateTimeProvider : IDateTimeProvider
{
    public DateOnly Today { get; }

    public FakeDateTimeProvider(DateOnly today) => Today = today;
}
