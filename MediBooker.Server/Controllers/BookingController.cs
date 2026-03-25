using MediBooker.Server.Models;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly BookingService _bookingService;
    private readonly IRoomRepository _roomRepo;
    private readonly IDateTimeProvider _dateTime;

    public BookingsController(BookingService bookingService, IRoomRepository roomRepo, IDateTimeProvider dateTime)
    {
        _bookingService = bookingService;
        _roomRepo = roomRepo;
        _dateTime = dateTime;
    }

    private string GetDoctorId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? Request.Headers["X-Doctor-Id"].FirstOrDefault()
           ?? "anonymous";

    private BookingStatus ComputeStatus(Booking b)
    {
        if (b.Status == BookingStatus.Cancelled) return BookingStatus.Cancelled;

        var today = _dateTime.Today;
        var now   = _dateTime.Now;

        if (b.Date < today) return BookingStatus.Completed;
        if (b.Date == today && now >= b.EndTime)   return BookingStatus.Completed;
        if (b.Date == today && now >= b.StartTime) return BookingStatus.Active;
        return BookingStatus.Upcoming;
    }

    private BookingResponseDto ToDto(Booking b)
    {
        var roomName = _roomRepo.GetById(b.RoomId)?.Name ?? $"Room {b.RoomId}";
        return new BookingResponseDto(
            b.Id,
            b.RoomId,
            roomName,
            b.DoctorId,
            b.Date.ToString("yyyy-MM-dd"),
            b.StartTime.ToString("HH:mm"),
            b.EndTime.ToString("HH:mm"),
            ComputeStatus(b).ToString().ToLower()
        );
    }

    [HttpGet("my")]
    public IActionResult GetMyBookings()
    {
        var doctorId = GetDoctorId();
        var bookings = _bookingService.GetDoctorBookings(doctorId);
        return Ok(bookings.Select(ToDto));
    }

    [HttpGet("all")]
    public IActionResult GetAllForDate([FromQuery] string? date)
    {
        var parsedDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.Today);

        var bookings = _bookingService.GetAllBookingsForDate(parsedDate);
        return Ok(bookings.Select(ToDto));
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateBookingRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var doctorId = GetDoctorId();
        var secureRequest = request with { DoctorId = doctorId };

        try
        {
            var booking = _bookingService.CreateBooking(secureRequest);
            return CreatedAtAction(nameof(GetMyBookings), new { id = booking.Id }, ToDto(booking));
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
        var doctorId = GetDoctorId();

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
