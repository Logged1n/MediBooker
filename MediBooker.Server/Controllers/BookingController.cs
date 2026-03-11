using MediBooker.Server.Models;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet("my")]
    public IActionResult GetMyBookings()
    {
        var doctorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var bookings = _bookingService.GetDoctorBookings(doctorId);
        return Ok(bookings);
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateBookingRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var doctorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var secureRequest = request with { DoctorId = doctorId };

        try
        {
            var booking = _bookingService.CreateBooking(secureRequest);
            return CreatedAtAction(nameof(GetMyBookings), new { id = booking.Id }, booking);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public IActionResult Cancel(int id)
    {
        var doctorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            _bookingService.CancelBooking(id, doctorId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}