using MediBooker.Server.Models;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly BookingService _bookingService;
    private readonly IRoomRepository _roomRepo;
    private readonly IDateTimeProvider _dateTime;

    public RoomsController(BookingService bookingService, IRoomRepository roomRepo, IDateTimeProvider dateTime)
    {
        _bookingService = bookingService;
        _roomRepo = roomRepo;
        _dateTime = dateTime;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var rooms = _roomRepo.GetAll();
        var today = _dateTime.Today;
        var now   = _dateTime.Now;

        var occupiedRoomIds = _bookingService
            .GetAllBookingsForDate(today)
            .Where(b => b.Status != BookingStatus.Cancelled
                     && b.StartTime <= now
                     && b.EndTime   >  now)
            .Select(b => b.RoomId)
            .ToHashSet();

        return Ok(rooms.Select(r => new
        {
            r.Id,
            r.Name,
            r.Type,
            r.Floor,
            r.IsActive,
            available = r.IsActive && !occupiedRoomIds.Contains(r.Id)
        }));
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public IActionResult Create([FromBody] Room room)
    {
        _roomRepo.Add(room);
        return CreatedAtAction(nameof(GetAll), new { id = room.Id }, room);
    }

    [HttpPut("{id:int}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public IActionResult Update(int id, [FromBody] Room room)
    {
        if (id != room.Id) return BadRequest();
        _roomRepo.Update(room);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public IActionResult Delete(int id)
    {
        _roomRepo.Delete(id);
        return NoContent();
    }

    [HttpGet("{id:int}/schedule")]
    public IActionResult GetSchedule(int id, [FromQuery] DateOnly date)
    {
        try
        {
            var schedule = _bookingService.GetRoomSchedule(id, date);
            return Ok(schedule);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/available-slots")]
    public IActionResult GetAvailableSlots(int id, [FromQuery] DateOnly date, [FromQuery] int duration = 60)
    {
        try
        {
            var slots = _bookingService.GetAvailableSlots(id, date, duration);
            return Ok(slots.Select(s => new { start = s.Start.ToString("HH:mm"), end = s.End.ToString("HH:mm") }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
