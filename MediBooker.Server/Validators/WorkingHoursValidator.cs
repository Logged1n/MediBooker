namespace MediBooker.Server.Validators;

public class WorkingHoursValidator
{
    private readonly TimeSpan _openingTime = new TimeSpan(8, 0, 0);  
    private readonly TimeSpan _closingTime = new TimeSpan(20, 0, 0); 

    public bool IsValid(DateTime bookingDate, TimeSpan startTime, TimeSpan endTime)
    {
        if (bookingDate.DayOfWeek == DayOfWeek.Saturday || bookingDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return false;
        }
        
        if (startTime < _openingTime || endTime > _closingTime)
        {
            return false;
        }

        return true;
    }
}