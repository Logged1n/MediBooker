namespace MediBooker.Server.Models;

public record BookingResponseDto(
    int Id,
    int RoomId,
    string RoomName,
    string DoctorId,
    string Date,
    string StartTime,
    string EndTime,
    string Status
);
