using MediBooker.Server.Validators;

namespace MediBooker.UnitTests;

public class MaintenanceBreakValidatorTests
{
    private readonly MaintenanceBreakValidator _validator = new MaintenanceBreakValidator();

    [Theory]
    [InlineData("10:00:00", "11:00:00", true)]
    [InlineData("15:00:00", "16:00:00", true)]
    [InlineData("11:00:00", "13:00:00", true)]
    [InlineData("14:00:00", "15:00:00", true)]

    [InlineData("12:30:00", "13:30:00", false)]
    [InlineData("13:30:00", "14:30:00", false)]
    [InlineData("13:15:00", "13:45:00", false)]
    [InlineData("12:00:00", "15:00:00", false)]
    [InlineData("12:59:00", "13:01:00", false)]
    [InlineData("13:57:00", "14:01:00", false)]

    public void IsValid_ShouldPreventBookingsDuringMaintenanceBreak(string startStr, string endStr, bool expected)
    {
        var start = TimeSpan.Parse(startStr);
        var end = TimeSpan.Parse(endStr);
        
        var result = _validator.IsValid(start, end);
        Assert.Equal(expected, result);
    }
}