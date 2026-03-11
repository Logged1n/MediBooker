using MediBooker.Server.Controllers;
using MediBooker.Server.Models;
using MediBooker.Server.Services;
using MediBooker.UnitTests.Fakes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Xunit;

namespace MediBooker.Tests.Unit.Controllers;

public class BookingsControllerTests
{
    private static readonly DateOnly Today = new(2026, 3, 10);
    private static readonly DateOnly Tomorrow = Today.AddDays(1);

    private static readonly Room ActiveRoom = new()
    { Id = 1, Name = "Sala 101", Type = "Konsultacja", Floor = 1, IsActive = true };

    private static BookingsController BuildSut(
        FakeBookingRepository? bookingRepo = null,
        FakeRoomRepository? roomRepo = null,
        string userId = "doc-kowalski")
    {
        var service = new BookingService(
            bookingRepo ?? new FakeBookingRepository(),
            roomRepo ?? new FakeRoomRepository(ActiveRoom),
            new FakeDateTimeProvider(Today));

        var sut = new BookingsController(service);
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "Test");
        sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return sut;
    }

    private static CreateBookingRequest ValidRequest(
        int roomId = 1,
        string doctorId = "doc-kowalski",
        DateOnly? date = null,
        TimeOnly? start = null,
        TimeOnly? end = null) => new(
            roomId,
            doctorId,
            date ?? Tomorrow,
            start ?? new TimeOnly(10, 0),
            end ?? new TimeOnly(11, 0));

    [Fact]
    public void GetMyBookings_ReturnsOk()
    {
        var repo = new FakeBookingRepository(
            new Booking { Id = 1, DoctorId = "doc-kowalski", RoomId = 1, Date = Tomorrow, Status = BookingStatus.Upcoming },
            new Booking { Id = 2, DoctorId = "doc-kowalski", RoomId = 1, Date = Tomorrow, Status = BookingStatus.Completed });
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetMyBookings();

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(ok.Value);
        Assert.Equal(2, body.Count);
        Assert.All(body, b => Assert.Equal("doc-kowalski", b.DoctorId));
    }

    [Fact]
    public void GetMyBookings_WhenNoneExist()
    {
        var sut = BuildSut();

        var result = sut.GetMyBookings();

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(ok.Value);
        Assert.Empty(body);
    }

    [Fact]
    public void Create_ValidRequest()
    {
        var sut = BuildSut();

        var result = sut.Create(ValidRequest());

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, created.StatusCode);
        var booking = Assert.IsType<Booking>(created.Value);
        Assert.Equal("doc-kowalski", booking.DoctorId);
        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void Create_RoomNotFound_Returns404()
    {
        var sut = BuildSut(roomRepo: new FakeRoomRepository());

        var result = sut.Create(ValidRequest());

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public void Create_InactiveRoom_Returns409()
    {
        var inactive = new Room { Id = 1, Name = "Sala 101", IsActive = false };
        var sut = BuildSut(roomRepo: new FakeRoomRepository(inactive));

        var result = sut.Create(ValidRequest());

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public void Create_StartTimeAfterEndTime()
    {
        var sut = BuildSut();

        var result = sut.Create(ValidRequest(start: new TimeOnly(12, 0), end: new TimeOnly(10, 0)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Create_PastDate0()
    {
        var sut = BuildSut();

        var result = sut.Create(ValidRequest(date: Today.AddDays(-1)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Create_DurationTooShort()
    {
        var sut = BuildSut();

        var result = sut.Create(ValidRequest(start: new TimeOnly(10, 0), end: new TimeOnly(10, 5)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Create_DurationTooLong()
    {
        var sut = BuildSut();

        var result = sut.Create(ValidRequest(start: new TimeOnly(8, 0), end: new TimeOnly(17, 1)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Create_ConflictingBooking_()
    {
        var existing = new Booking
        {
            Id = 1,
            RoomId = 1,
            DoctorId = "doc-nowak",
            Date = Tomorrow,
            StartTime = new TimeOnly(9, 30),
            EndTime = new TimeOnly(10, 30),
            Status = BookingStatus.Upcoming
        };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(existing));

        var result = sut.Create(ValidRequest());

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public void Create_CancelledBookingAtSameSlot()
    {
        var cancelled = new Booking
        {
            Id = 1,
            RoomId = 1,
            DoctorId = "doc-nowak",
            Date = Tomorrow,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(11, 0),
            Status = BookingStatus.Cancelled
        };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(cancelled));

        var result = sut.Create(ValidRequest());

        Assert.IsType<CreatedAtActionResult>(result);
    }

    [Fact]
    public void Create_AddsBookingToRepository()
    {
        var repo = new FakeBookingRepository();
        var sut = BuildSut(bookingRepo: repo);

        sut.Create(ValidRequest());

        Assert.Single(repo.GetForDoctor("doc-kowalski"));
    }

    [Fact]
    public void Cancel_OwnBooking_Returns204()
    {
        var booking = new Booking { Id = 1, DoctorId = "doc-kowalski", Status = BookingStatus.Upcoming };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(booking));

        var result = sut.Cancel(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public void Cancel_BookingNotFound_Returns404()
    {
        var sut = BuildSut();

        var result = sut.Cancel(99);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public void Cancel_OtherDoctorsBooking_Returns403()
    {
        var booking = new Booking { Id = 1, DoctorId = "doc-nowak", Status = BookingStatus.Upcoming };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(booking), userId: "doc-kowalski");

        var result = sut.Cancel(1);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public void Cancel_AlreadyCancelled_Returns400()
    {
        var booking = new Booking { Id = 1, DoctorId = "doc-kowalski", Status = BookingStatus.Cancelled };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(booking));

        var result = sut.Cancel(1);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Cancel_CompletedBooking_Returns400()
    {
        var booking = new Booking { Id = 1, DoctorId = "doc-kowalski", Status = BookingStatus.Completed };
        var sut = BuildSut(bookingRepo: new FakeBookingRepository(booking));

        var result = sut.Cancel(1);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}