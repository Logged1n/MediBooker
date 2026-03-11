using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public interface IRoomRepository
{
    Room? GetById(int id);
    IReadOnlyList<Room> GetAll();
}
