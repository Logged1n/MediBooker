using MediBooker.Server.Validators;

namespace MediBooker.UnitTests;

public class MinimumLeadTimeValidatorTests
{
    private readonly MinimumLeadTimeValidator _validator =  new MinimumLeadTimeValidator();
    
    [Theory]
    [InlineData("2026-03-10T12:00:00", "2026-03-12", "12:00:00", true)]
    [InlineData("2026-03-10T12:00:00", "2026-03-11", "12:00:00", true)]
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "15:00:00", true)]
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "13:30:00", true)]
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "13:01:00", true)]
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "13:00:00", true)]
    
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "12:59:00", false)]
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "12:30:00", false)] 
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "12:05:00", false)] 
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "12:00:00", false)] 
    [InlineData("2026-03-10T12:00:00", "2026-03-10", "11:00:00", false)]
    
    public void IsValid_ShouldRequireMinimumLeadTime(string currentStr, string bookingDateStr, string startTimeStr, bool expected)
    {
        var currentDateTime = DateTime.Parse(currentStr);
        var bookingDate = DateTime.Parse(bookingDateStr);
        var startTime = TimeSpan.Parse(startTimeStr);
        
        var result = _validator.IsValid(currentDateTime, bookingDate, startTime);
        
        Assert.Equal(expected, result);
    }
}