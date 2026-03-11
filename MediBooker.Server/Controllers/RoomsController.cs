using MediBooker.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly BookingService _bookingService;
    private readonly IRoomRepository _roomRepo;

    public RoomsController(BookingService bookingService, IRoomRepository roomRepo)
    {
        _bookingService = bookingService;
        _roomRepo = roomRepo;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var rooms = _roomRepo.GetAll();
        return Ok(rooms.Select(r => new
        {
            r.Id,
            r.Name,
            r.Type,
            r.Floor,
            available = r.IsActive
        }));
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
}
