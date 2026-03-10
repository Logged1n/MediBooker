namespace MediBooker.Server.Validators;

public class MaintenanceBreakValidator
{
    private readonly TimeSpan _breakStart = new TimeSpan(13, 0, 0);
    private readonly TimeSpan _breakEnd = new TimeSpan(14, 0, 0);

    public bool IsValid(TimeSpan start, TimeSpan end)
    {
        if (end <= _breakStart)
        {
            return true;
        }

        if (start >= _breakEnd)
        {
            return true;
        }
        return false;
    }
}