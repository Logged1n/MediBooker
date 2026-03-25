namespace MediBooker.Server.Models;

public record RegisterRequest(
    string Username,
    string Password,
    string DisplayName,
    string Role = "Doctor"
);
