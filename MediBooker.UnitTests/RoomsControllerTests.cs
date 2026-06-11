using MediBooker.Server.Controllers;
using MediBooker.Server.Models;
using MediBooker.Server.Policies;
using MediBooker.Server.Services;
using MediBooker.UnitTests.Fakes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Xunit;

namespace MediBooker.Tests.Unit.Controllers;

public class RoomsControllerTests
{
    private static readonly DateOnly Today    = new(2026, 3, 10);
    private static readonly DateOnly Tomorrow = Today.AddDays(1);

    private static readonly Room Room1 = new()
        { Id = 1, Name = "Sala 101", Type = "Konsultacja", Floor = 1, IsActive = true };

    private static RoomsController BuildSut(
        FakeBookingRepository? bookingRepo = null,
        FakeRoomRepository?    roomRepo    = null)
    {
        var repo    = bookingRepo ?? new FakeBookingRepository();
        var rooms   = roomRepo   ?? new FakeRoomRepository(Room1);
        var service = new BookingService(repo, rooms, new FakeDateTimeProvider(Today), new BookingPolicy());

        var sut = new RoomsController(service, rooms, new FakeDateTimeProvider(Today));
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "doc-kowalski")], "Test");
        sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return sut;
    }

    [Fact]
    public void GetSchedule_RoomExists()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Completed));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var ok   = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(ok.Value);
        Assert.Equal(2, body.Count);
    }

    [Fact]
    public void GetSchedule_RoomNotFound()
    {
        var sut = BuildSut(roomRepo: new FakeRoomRepository());

        var result = sut.GetSchedule(99, Tomorrow);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public void GetSchedule_NoBookings()
    {
        var sut = BuildSut();

        var result = sut.GetSchedule(1, Tomorrow);

        var ok   = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(ok.Value);
        Assert.Empty(body);
    }

    [Fact]
    public void GetSchedule_ExcludesCancelledBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Cancelled));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var ok   = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(ok.Value);
        Assert.Single(body);
        Assert.DoesNotContain(body, b => b.Status == BookingStatus.Cancelled);
    }

    [Fact]
    public void GetSchedule_ReturnsSortedByStartTime()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(3, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(14, 0), new TimeOnly(15, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0),  new TimeOnly(9, 0)),  BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Upcoming));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(new TimeOnly(8, 0),  body[0].StartTime);
        Assert.Equal(new TimeOnly(11, 0), body[1].StartTime);
        Assert.Equal(new TimeOnly(14, 0), body[2].StartTime);
    }

    [Fact]
    public void GetSchedule_IncludesCompletedBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0), new TimeOnly(9, 0)), BookingStatus.Completed));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Single(body, b => b.Status == BookingStatus.Completed);
    }

    [Fact]
    public void GetSchedule_IncludesActiveBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0)), BookingStatus.Active));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Single(body, b => b.Status == BookingStatus.Active);
    }

    [Fact]
    public void GetSchedule_OnlyCancelledBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Cancelled),
            Booking.Reconstitute(2, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Cancelled));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Empty(body);
    }

    [Fact]
    public void GetSchedule_FutureDate_Returns200()
    {
        var sut = BuildSut();

        var result = sut.GetSchedule(1, Tomorrow.AddDays(30));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public void GetSchedule_InactiveRoom()
    {
        var inactive = new Room { Id = 2, Name = "Sala zamknięta", IsActive = false };
        var sut = BuildSut(roomRepo: new FakeRoomRepository(inactive));

        var result = sut.GetSchedule(2, Tomorrow);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public void GetSchedule_NotFoundMessage()
    {
        var sut = BuildSut(roomRepo: new FakeRoomRepository());

        var result = sut.GetSchedule(42, Tomorrow);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Contains("42", notFound.Value!.ToString());
    }

    [Fact]
    public void GetSchedule_SingleBooking_ReturnsSingleElement()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(5, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(15, 0), new TimeOnly(16, 0)), BookingStatus.Upcoming));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Single(body);
        Assert.Equal(5, body[0].Id);
    }

    [Fact]
    public void GetSchedule_MultipleStatuses()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "doc-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0),  new TimeOnly(9, 0)),  BookingStatus.Completed),
            Booking.Reconstitute(2, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Active),
            Booking.Reconstitute(3, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(4, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Cancelled),
            Booking.Reconstitute(5, 1, "doc-nowak",    new TimeSlot(Tomorrow, new TimeOnly(14, 0), new TimeOnly(15, 0)), BookingStatus.Cancelled));
        var sut = BuildSut(bookingRepo: repo);

        var result = sut.GetSchedule(1, Tomorrow);

        var body = Assert.IsAssignableFrom<IReadOnlyList<Booking>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(3, body.Count);
    }
}
