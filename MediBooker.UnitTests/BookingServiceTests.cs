using MediBooker.Server.Models;
using MediBooker.Server.Services;
using MediBooker.UnitTests.Fakes;

namespace MediBooker.UnitTests;

public class BookingServiceTests
{

    private static readonly DateOnly Today = new(2026, 3, 10);
    private static readonly DateOnly Tomorrow = Today.AddDays(1);

    private static readonly Room ActiveRoom = new()
        { Id = 1, Name = "Room 101", Type = "Consultation", Floor = 1, IsActive = true };

    private static readonly Room InactiveRoom = new()
        { Id = 2, Name = "Room 202", Type = "Surgery", Floor = 2, IsActive = false };

    private static BookingService BuildService(
        FakeBookingRepository? bookingRepo = null,
        FakeRoomRepository?   roomRepo    = null,
        DateOnly?             today       = null)
    {
        return new BookingService(
            bookingRepo ?? new FakeBookingRepository(),
            roomRepo    ?? new FakeRoomRepository(ActiveRoom, InactiveRoom),
            new FakeDateTimeProvider(today ?? Today));
    }

    private static CreateBookingRequest ValidRequest(
        int      roomId    = 1,
        string   doctorId  = "dr-kowalski",
        DateOnly? date     = null,
        TimeOnly? start    = null,
        TimeOnly? end      = null) => new(
            roomId,
            doctorId,
            date  ?? Tomorrow,
            start ?? new TimeOnly(9, 0),
            end   ?? new TimeOnly(10, 0));


    [Fact]
    public void CreateBooking_ValidRequest_ReturnsBookingWithCorrectDetails()
    {
        var service = BuildService();

        var booking = service.CreateBooking(ValidRequest());

        Assert.Equal(1, booking.RoomId);
        Assert.Equal("dr-kowalski", booking.DoctorId);
        Assert.Equal(Tomorrow, booking.Date);
        Assert.Equal(new TimeOnly(9, 0), booking.StartTime);
        Assert.Equal(new TimeOnly(10, 0), booking.EndTime);
        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void CreateBooking_RoomNotFound_ThrowsKeyNotFoundException()
    {
        var service = BuildService();

        Assert.Throws<KeyNotFoundException>(() =>
            service.CreateBooking(ValidRequest(roomId: 999)));
    }

    [Fact]
    public void CreateBooking_InactiveRoom_ThrowsInvalidOperationException()
    {
        var service = BuildService();

        Assert.Throws<InvalidOperationException>(() =>
            service.CreateBooking(ValidRequest(roomId: InactiveRoom.Id)));
    }

    [Fact]
    public void CreateBooking_StartTimeAfterEndTime_ThrowsArgumentException()
    {
        var service = BuildService();

        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(11, 0), end: new TimeOnly(9, 0))));
    }

    [Fact]
    public void CreateBooking_StartTimeEqualsEndTime_ThrowsArgumentException()
    {
        var service = BuildService();

        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(9, 0), end: new TimeOnly(9, 0))));
    }

    [Fact]
    public void CreateBooking_DateInThePast_ThrowsArgumentException()
    {
        var service = BuildService();

        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(date: Today.AddDays(-1))));
    }

    [Fact]
    public void CreateBooking_DurationBelowMinimum_ThrowsArgumentException()
    {
        var service = BuildService();

        // 9:00 – 9:10 = 10 min (below 15 min minimum)
        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(9, 0), end: new TimeOnly(9, 10))));
    }

    [Fact]
    public void CreateBooking_DurationAboveMaximum_ThrowsArgumentException()
    {
        var service = BuildService();

        // 8:00 - 17:01 = 541 min (above 480 min maximum)
        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(8, 0), end: new TimeOnly(17, 1))));
    }

    [Fact]
    public void CreateBooking_ConflictingBooking_ThrowsInvalidOperationException()
    {
        var existingBooking = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-nowak",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(11, 0),
            Status = BookingStatus.Upcoming,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existingBooking));

        // 10:00 – 11:00 overlaps with 09:00 – 11:00
        Assert.Throws<InvalidOperationException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(10, 0), end: new TimeOnly(11, 0))));
    }

    [Fact]
    public void CreateBooking_CancelledBookingDoesNotBlockSlot_Succeeds()
    {
        var cancelledBooking = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-nowak",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(11, 0),
            Status = BookingStatus.Cancelled,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(cancelledBooking));

        // Same slot should be bookable because the existing one is cancelled
        var booking = service.CreateBooking(ValidRequest(start: new TimeOnly(9, 0), end: new TimeOnly(11, 0)));

        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void CreateBooking_AdjacentSlot_NoConflict_Succeeds()
    {
        var existingBooking = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-nowak",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Upcoming,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existingBooking));

        // Starts exactly when the existing one ends – no conflict
        var booking = service.CreateBooking(ValidRequest(start: new TimeOnly(10, 0), end: new TimeOnly(11, 0)));

        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void CreateBooking_DifferentRoomSameTime_Succeeds()
    {
        var existingBooking = new Booking
        {
            Id = 1, RoomId = 2, DoctorId = "dr-nowak",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Upcoming,
        };
        var roomRepo = new FakeRoomRepository(
            ActiveRoom,
            new Room { Id = 2, Name = "Room 202", IsActive = true });
        var service = BuildService(
            bookingRepo: new FakeBookingRepository(existingBooking),
            roomRepo: roomRepo);

        // Room 1 at the same time – different room, no conflict
        var booking = service.CreateBooking(ValidRequest(roomId: 1, start: new TimeOnly(9, 0), end: new TimeOnly(10, 0)));

        Assert.Equal(1, booking.RoomId);
    }

    // CancelBooking

    [Fact]
    public void CancelBooking_ValidOwnBooking_SetsStatusToCancelled()
    {
        var existing = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-kowalski",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Upcoming,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        service.CancelBooking(1, "dr-kowalski");

        Assert.Equal(BookingStatus.Cancelled, existing.Status);
    }

    [Fact]
    public void CancelBooking_BookingNotFound_ThrowsKeyNotFoundException()
    {
        var service = BuildService();

        Assert.Throws<KeyNotFoundException>(() => service.CancelBooking(999, "dr-kowalski"));
    }

    [Fact]
    public void CancelBooking_OtherDoctorsBooking_ThrowsUnauthorizedAccessException()
    {
        var existing = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-nowak",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Upcoming,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<UnauthorizedAccessException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    [Fact]
    public void CancelBooking_AlreadyCancelledBooking_ThrowsInvalidOperationException()
    {
        var existing = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-kowalski",
            Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Cancelled,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<InvalidOperationException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    [Fact]
    public void CancelBooking_CompletedBooking_ThrowsInvalidOperationException()
    {
        var existing = new Booking
        {
            Id = 1, RoomId = 1, DoctorId = "dr-kowalski",
            Date = Today.AddDays(-1), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0),
            Status = BookingStatus.Completed,
        };
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<InvalidOperationException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    // GetDoctorBookings 

    [Fact]
    public void GetDoctorBookings_ReturnsOnlyBookingsForGivenDoctor()
    {
        var repo = new FakeBookingRepository(
            new Booking { Id = 1, DoctorId = "dr-kowalski", RoomId = 1, Date = Tomorrow, StartTime = new TimeOnly(9, 0),  EndTime = new TimeOnly(10, 0), Status = BookingStatus.Upcoming },
            new Booking { Id = 2, DoctorId = "dr-nowak",    RoomId = 1, Date = Tomorrow, StartTime = new TimeOnly(11, 0), EndTime = new TimeOnly(12, 0), Status = BookingStatus.Upcoming },
            new Booking { Id = 3, DoctorId = "dr-kowalski", RoomId = 1, Date = Tomorrow, StartTime = new TimeOnly(13, 0), EndTime = new TimeOnly(14, 0), Status = BookingStatus.Upcoming });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetDoctorBookings("dr-kowalski");

        Assert.Equal(2, result.Count);
        Assert.All(result, b => Assert.Equal("dr-kowalski", b.DoctorId));
    }

    [Fact]
    public void GetDoctorBookings_ReturnsEmptyListWhenDoctorHasNoBookings()
    {
        var service = BuildService();

        var result = service.GetDoctorBookings("dr-nobody");

        Assert.Empty(result);
    }

    [Fact]
    public void GetDoctorBookings_DoesNotReturnOtherDoctorsBookings()
    {
        var repo = new FakeBookingRepository(
            new Booking { Id = 1, DoctorId = "dr-nowak", RoomId = 1, Date = Tomorrow, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 0), Status = BookingStatus.Upcoming });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetDoctorBookings("dr-kowalski");

        Assert.Empty(result);
    }

    // GetRoomSchedule

    [Fact]
    public void GetRoomSchedule_RoomNotFound_ThrowsKeyNotFoundException()
    {
        var service = BuildService();

        Assert.Throws<KeyNotFoundException>(() =>
            service.GetRoomSchedule(999, Tomorrow));
    }

    [Fact]
    public void GetRoomSchedule_NoBookingsOnDate_ReturnsEmptyList()
    {
        var service = BuildService();

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetRoomSchedule_ReturnsBookingsForGivenRoomAndDate()
    {
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 1,
                RoomId = 1,
                DoctorId = "dr-kowalski",
                Date = Tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Upcoming
            });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Single(result);
        Assert.Equal(1, result[0].Id);
    }

    [Fact]
    public void GetRoomSchedule_ExcludesCancelledBookings()
    {
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 1,
                RoomId = 1,
                DoctorId = "dr-kowalski",
                Date = Tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Cancelled
            });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetRoomSchedule_IncludesUpcomingActiveAndCompletedBookings()
    {
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 1,
                RoomId = 1,
                DoctorId = "dr-kowalski",
                Date = Tomorrow,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(9, 0),
                Status = BookingStatus.Upcoming
            },
            new Booking
            {
                Id = 2,
                RoomId = 1,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Active
            },
            new Booking
            {
                Id = 3,
                RoomId = 1,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                Status = BookingStatus.Completed
            },
            new Booking
            {
                Id = 4,
                RoomId = 1,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(11, 0),
                EndTime = new TimeOnly(12, 0),
                Status = BookingStatus.Cancelled
            });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Equal(3, result.Count);
        Assert.DoesNotContain(result, b => b.Status == BookingStatus.Cancelled);
    }

    [Fact]
    public void GetRoomSchedule_ReturnsSortedByStartTime()
    {
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 3,
                RoomId = 1,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(13, 0),
                EndTime = new TimeOnly(14, 0),
                Status = BookingStatus.Upcoming
            },
            new Booking
            {
                Id = 1,
                RoomId = 1,
                DoctorId = "dr-kowalski",
                Date = Tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Upcoming
            },
            new Booking
            {
                Id = 2,
                RoomId = 1,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(11, 0),
                EndTime = new TimeOnly(12, 0),
                Status = BookingStatus.Upcoming
            });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Equal(new TimeOnly(9, 0), result[0].StartTime);
        Assert.Equal(new TimeOnly(11, 0), result[1].StartTime);
        Assert.Equal(new TimeOnly(13, 0), result[2].StartTime);
    }

    [Fact]
    public void GetRoomSchedule_DoesNotReturnBookingsFromOtherRooms()
    {
        var roomRepo = new FakeRoomRepository(
            ActiveRoom,
            new Room { Id = 2, Name = "Room 202", Type = "Surgery", Floor = 2, IsActive = true });
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 1,
                RoomId = 2,
                DoctorId = "dr-nowak",
                Date = Tomorrow,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Upcoming
            });
        var service = BuildService(bookingRepo: repo, roomRepo: roomRepo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetRoomSchedule_DoesNotReturnBookingsFromOtherDates()
    {
        var repo = new FakeBookingRepository(
            new Booking
            {
                Id = 1,
                RoomId = 1,
                DoctorId = "dr-kowalski",
                Date = Tomorrow.AddDays(1),
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(10, 0),
                Status = BookingStatus.Upcoming
            });
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }
}
