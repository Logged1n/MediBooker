using MediBooker.Server.Models;
using MediBooker.Server.Services;

namespace MediBooker.UnitTests.Fakes;

public class FakeRoomRepository : IRoomRepository
{
    private readonly List<Room> _rooms;

    public FakeRoomRepository(params Room[] rooms) => _rooms = [.. rooms];

    public Room? GetById(int id) => _rooms.FirstOrDefault(r => r.Id == id);
    public IReadOnlyList<Room> GetAll() => _rooms.ToList();
    public void Add(Room room) => _rooms.Add(room);
    public void Update(Room room) { var i = _rooms.FindIndex(r => r.Id == room.Id); if (i >= 0) _rooms[i] = room; }
    public void Delete(int id) => _rooms.RemoveAll(r => r.Id == id);
}
