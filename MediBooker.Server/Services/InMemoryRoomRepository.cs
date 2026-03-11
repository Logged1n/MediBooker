using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public class InMemoryRoomRepository : IRoomRepository
{
    private static readonly List<Room> _rooms =
    [
        new Room { Id = 1, Name = "Room 101", Type = "Examination",  Floor = 1, IsActive = true  },
        new Room { Id = 2, Name = "Room 203", Type = "Surgery",      Floor = 2, IsActive = true  },
        new Room { Id = 3, Name = "Room 115", Type = "Consultation", Floor = 1, IsActive = true  },
        new Room { Id = 4, Name = "Room 302", Type = "Radiology",    Floor = 3, IsActive = true  },
        new Room { Id = 5, Name = "Room 210", Type = "ICU",          Floor = 2, IsActive = true  },
        new Room { Id = 6, Name = "Room 118", Type = "Consultation", Floor = 1, IsActive = true  },
    ];

    public Room? GetById(int id)
        => _rooms.FirstOrDefault(r => r.Id == id);

    public IReadOnlyList<Room> GetAll()
        => _rooms.AsReadOnly();
}
