using MediBooker.Server.Models;
using MediBooker.Server.Services;

namespace MediBooker.UnitTests.Fakes;

public class FakeRoomRepository : IRoomRepository
{
    private readonly List<Room> _rooms;

    public FakeRoomRepository(params Room[] rooms) => _rooms = [.. rooms];

    public Room? GetById(int id) => _rooms.FirstOrDefault(r => r.Id == id);
}
