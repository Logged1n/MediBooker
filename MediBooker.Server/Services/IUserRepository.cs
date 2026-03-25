using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public interface IUserRepository
{
    void Add(User user);
    User? FindByUsername(string username);
    int NextId();
}
