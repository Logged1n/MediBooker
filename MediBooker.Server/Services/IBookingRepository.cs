using MediBooker.Server.Models;

namespace MediBooker.Server.Services;

public interface IBookingRepository
{
    Booking? GetById(int id);
    IReadOnlyList<Booking> GetForRoom(int roomId, DateOnly date);
    IReadOnlyList<Booking> GetForDoctor(string doctorId);
    void Add(Booking booking);
    void Update(Booking booking);
    int NextId();
    IReadOnlyList<Booking> GetForDate(DateOnly date);
}
