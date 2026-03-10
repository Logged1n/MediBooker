namespace MediBooker.Server.Validators;

public class MinimumLeadTimeValidator
{
    private const int MinimumLeadTimeMinutes = 60;

    public bool IsValid(DateTime currentDateTime, DateTime bookingDate, TimeSpan startTime)
    {
        var bookingStartDateTime = bookingDate.Date + startTime;

        var leadTime = bookingStartDateTime - currentDateTime;
        
        return leadTime.TotalMinutes >= MinimumLeadTimeMinutes;
    }
}