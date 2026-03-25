using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public class InMemoryUserRepository : IUserRepository
{
    private readonly List<User> _users = new()
    {
        new User { Id = 1, Username = "dr-kowalski", PasswordHash = HashPassword("pass123"), Role = "Doctor",  DoctorId = "dr-kowalski", DisplayName = "Dr. Kowalski" },
        new User { Id = 2, Username = "dr-smith",    PasswordHash = HashPassword("pass123"), Role = "Doctor",  DoctorId = "dr-smith",    DisplayName = "Dr. Smith"    },
        new User { Id = 3, Username = "admin",       PasswordHash = HashPassword("admin123"), Role = "Admin",  DoctorId = "admin",       DisplayName = "Administrator" },
    };

    private int _nextId = 4;

    public void Add(User user) => _users.Add(user);

    public User? FindByUsername(string username)
        => _users.FirstOrDefault(u => u.Username == username);

    public int NextId() => _nextId++;

    public static string HashPassword(string password)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        return Convert.ToBase64String(sha.ComputeHash(bytes));
    }
}
