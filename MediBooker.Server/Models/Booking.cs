namespace MediBooker.Server.Models;

public class Booking
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public string DoctorId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public BookingStatus Status { get; set; }
}
