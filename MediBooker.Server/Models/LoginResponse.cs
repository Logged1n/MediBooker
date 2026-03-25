namespace MediBooker.Server.Models;

public record LoginResponse(
    string Token,
    string DoctorId,
    string DisplayName,
    string Role
);
