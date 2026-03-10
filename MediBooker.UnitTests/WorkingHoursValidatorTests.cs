using System;
using Xunit;
using MediBooker.Server.Validators;

namespace MediBooker.UnitTests;

public class WorkingHoursValidatorTests
{
    private readonly WorkingHoursValidator _validator =  new WorkingHoursValidator();

    [Theory]
    [InlineData("2026-03-16", "08:00:00", "09:00:00", true)]
    [InlineData("2026-03-18", "12:00:00", "13:00:00", true)]
    [InlineData("2026-03-20", "08:30:00", "16:00:00", true)]

    [InlineData("2026-03-14", "08:00:00", "09:00:00", false)]
    [InlineData("2026-03-15", "08:00:00", "09:00:00", false)]

    [InlineData("2026-03-16", "07:59:00", "9:00:00", false)]
    [InlineData("2026-03-16", "19:30:00", "20:30:00", false)]
    [InlineData("2026-03-16", "06:00:00", "07:30:00", false)]
    [InlineData("2026-03-16", "21:00:00", "22:00:00", false)]

    public void ISValid_ShouldValidateClinicWorkingHours(string dateString, string startString, string endString, bool expected)
    {
        var date = DateTime.Parse(dateString);
        var start =  TimeSpan.Parse(startString);
        var end =  TimeSpan.Parse(endString);
        
        var result = _validator.IsValid(date, start, end);
        
        Assert.Equal(expected, result);
    }
}