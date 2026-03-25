namespace MediBooker.Server.Models;

public record CreateBookingRequest(
    int RoomId,
    string? DoctorId,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime);
