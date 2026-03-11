using MediBooker.Server.Models;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoomsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public RoomsController(BookingService bookingService)
    {
        _bookingService = bookingService;
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