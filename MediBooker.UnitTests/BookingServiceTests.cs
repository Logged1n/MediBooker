using MediBooker.Server.Models;
using MediBooker.Server.Policies;
using MediBooker.Server.Services;
using MediBooker.UnitTests.Fakes;

namespace MediBooker.UnitTests;

public class BookingServiceTests
{
    private static readonly DateOnly Today    = new(2026, 3, 10);
    private static readonly DateOnly Tomorrow = Today.AddDays(1);

    private static readonly Room ActiveRoom = new()
        { Id = 1, Name = "Room 101", Type = "Consultation", Floor = 1, IsActive = true };

    private static readonly Room InactiveRoom = new()
        { Id = 2, Name = "Room 202", Type = "Surgery", Floor = 2, IsActive = false };

    private static BookingService BuildService(
        FakeBookingRepository? bookingRepo = null,
        FakeRoomRepository?    roomRepo    = null,
        DateOnly?              today       = null)
        => new BookingService(
            bookingRepo ?? new FakeBookingRepository(),
            roomRepo    ?? new FakeRoomRepository(ActiveRoom, InactiveRoom),
            new FakeDateTimeProvider(today ?? Today),
            new BookingPolicy());

    private static CreateBookingRequest ValidRequest(
        int       roomId   = 1,
        string    doctorId = "dr-kowalski",
        DateOnly? date     = null,
        TimeOnly? start    = null,
        TimeOnly? end      = null)
        => new(
            roomId,
            doctorId,
            date  ?? Tomorrow,
            start ?? new TimeOnly(9, 0),
            end   ?? new TimeOnly(10, 0));

    // ── CreateBooking ─────────────────────────────────────────────────────────

    [Fact]
    public void CreateBooking_ValidRequest_ReturnsBookingWithCorrectDetails()
    {
        var service = BuildService();

        var booking = service.CreateBooking(ValidRequest());

        Assert.Equal(1, booking.RoomId);
        Assert.Equal("dr-kowalski", booking.DoctorId);
        Assert.Equal(Tomorrow, booking.Date);
        Assert.Equal(new TimeOnly(9, 0),  booking.StartTime);
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

        // 9:00 – 9:10 = 10 min (poniżej 15 min minimum)
        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(9, 0), end: new TimeOnly(9, 10))));
    }

    [Fact]
    public void CreateBooking_DurationAboveMaximum_ThrowsArgumentException()
    {
        var service = BuildService();

        // 8:00 – 17:01 = 541 min (powyżej 480 min maximum)
        Assert.Throws<ArgumentException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(8, 0), end: new TimeOnly(17, 1))));
    }

    [Fact]
    public void CreateBooking_ConflictingBooking_ThrowsInvalidOperationException()
    {
        var existing = Booking.Reconstitute(
            1, 1, "dr-nowak",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(11, 0)),
            BookingStatus.Upcoming);
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        // 10:00 – 11:00 nakłada się na 09:00 – 11:00
        Assert.Throws<InvalidOperationException>(() =>
            service.CreateBooking(ValidRequest(start: new TimeOnly(10, 0), end: new TimeOnly(11, 0))));
    }

    [Fact]
    public void CreateBooking_CancelledBookingDoesNotBlockSlot_Succeeds()
    {
        var cancelled = Booking.Reconstitute(
            1, 1, "dr-nowak",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(11, 0)),
            BookingStatus.Cancelled);
        var service = BuildService(bookingRepo: new FakeBookingRepository(cancelled));

        var booking = service.CreateBooking(ValidRequest(start: new TimeOnly(9, 0), end: new TimeOnly(11, 0)));

        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void CreateBooking_AdjacentSlot_NoConflict_Succeeds()
    {
        var existing = Booking.Reconstitute(
            1, 1, "dr-nowak",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Upcoming);
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        // Zaczyna dokładnie gdy poprzedni kończy — brak konfliktu
        var booking = service.CreateBooking(ValidRequest(start: new TimeOnly(10, 0), end: new TimeOnly(11, 0)));

        Assert.Equal(BookingStatus.Upcoming, booking.Status);
    }

    [Fact]
    public void CreateBooking_DifferentRoomSameTime_Succeeds()
    {
        var existing = Booking.Reconstitute(
            1, 2, "dr-nowak",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Upcoming);
        var roomRepo = new FakeRoomRepository(
            ActiveRoom,
            new Room { Id = 2, Name = "Room 202", IsActive = true });
        var service = BuildService(
            bookingRepo: new FakeBookingRepository(existing),
            roomRepo:    roomRepo);

        var booking = service.CreateBooking(ValidRequest(roomId: 1, start: new TimeOnly(9, 0), end: new TimeOnly(10, 0)));

        Assert.Equal(1, booking.RoomId);
    }

    // ── CancelBooking ─────────────────────────────────────────────────────────

    [Fact]
    public void CancelBooking_ValidOwnBooking_SetsStatusToCancelled()
    {
        var existing = Booking.Reconstitute(
            1, 1, "dr-kowalski",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Upcoming);
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
        var existing = Booking.Reconstitute(
            1, 1, "dr-nowak",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Upcoming);
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<UnauthorizedAccessException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    [Fact]
    public void CancelBooking_AlreadyCancelledBooking_ThrowsInvalidOperationException()
    {
        var existing = Booking.Reconstitute(
            1, 1, "dr-kowalski",
            new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Cancelled);
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<InvalidOperationException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    [Fact]
    public void CancelBooking_CompletedBooking_ThrowsInvalidOperationException()
    {
        var existing = Booking.Reconstitute(
            1, 1, "dr-kowalski",
            new TimeSlot(Today.AddDays(-1), new TimeOnly(9, 0), new TimeOnly(10, 0)),
            BookingStatus.Completed);
        var service = BuildService(bookingRepo: new FakeBookingRepository(existing));

        Assert.Throws<InvalidOperationException>(() =>
            service.CancelBooking(1, "dr-kowalski"));
    }

    // ── GetDoctorBookings ─────────────────────────────────────────────────────

    [Fact]
    public void GetDoctorBookings_ReturnsOnlyBookingsForGivenDoctor()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(3, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(15, 0), new TimeOnly(16, 0)), BookingStatus.Upcoming));
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
            Booking.Reconstitute(1, 1, "dr-nowak", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetDoctorBookings("dr-kowalski");

        Assert.Empty(result);
    }

    // ── GetRoomSchedule ───────────────────────────────────────────────────────

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
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Single(result);
        Assert.Equal(1, result[0].Id);
    }

    [Fact]
    public void GetRoomSchedule_ExcludesCancelledBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Cancelled));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetRoomSchedule_IncludesUpcomingActiveAndCompletedBookings()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0),  new TimeOnly(9, 0)),  BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Active),
            Booking.Reconstitute(3, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0)), BookingStatus.Completed),
            Booking.Reconstitute(4, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Cancelled));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Equal(3, result.Count);
        Assert.DoesNotContain(result, b => b.Status == BookingStatus.Cancelled);
    }

    [Fact]
    public void GetRoomSchedule_ReturnsSortedByStartTime()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(3, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(15, 0), new TimeOnly(16, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Equal(new TimeOnly(9, 0),  result[0].StartTime);
        Assert.Equal(new TimeOnly(11, 0), result[1].StartTime);
        Assert.Equal(new TimeOnly(15, 0), result[2].StartTime);
    }

    [Fact]
    public void GetRoomSchedule_DoesNotReturnBookingsFromOtherRooms()
    {
        var roomRepo = new FakeRoomRepository(
            ActiveRoom,
            new Room { Id = 2, Name = "Room 202", Type = "Surgery", Floor = 2, IsActive = true });
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 2, "dr-nowak", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo, roomRepo: roomRepo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetRoomSchedule_DoesNotReturnBookingsFromOtherDates()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetRoomSchedule(1, Tomorrow);

        Assert.Empty(result);
    }

    // ── GetAvailableSlots ─────────────────────────────────────────────────────

    [Fact]
    public void GetAvailableSlots_RoomNotFound_ThrowsKeyNotFoundException()
    {
        var service = BuildService();

        Assert.Throws<KeyNotFoundException>(() =>
            service.GetAvailableSlots(999, Tomorrow, 60));
    }

    [Fact]
    public void GetAvailableSlots_InvalidSlotDuration_ThrowsArgumentException()
    {
        var service = BuildService();

        Assert.Throws<ArgumentException>(() =>
            service.GetAvailableSlots(1, Tomorrow, 0));
    }

    [Fact]
    public void GetAvailableSlots_NoBookings_ReturnsAllSlots()
    {
        var service = BuildService();

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        // 8:00–20:00 = 12 slotów po 60 min, minus 1 przerwa techniczna (13:00–14:00) = 11
        Assert.Equal(11, result.Count);
    }

    [Fact]
    public void GetAvailableSlots_OneBooking_ExcludesThatSlot()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.DoesNotContain(result, s => s.Start == new TimeOnly(9, 0));
    }

    [Fact]
    public void GetAvailableSlots_CancelledBooking_SlotRemainsAvailable()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Cancelled));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.Contains(result, s => s.Start == new TimeOnly(9, 0));
    }

    [Fact]
    public void GetAvailableSlots_FullyBookedDay_ReturnsEmptyList()
    {
        var bookings = Enumerable.Range(8, 12).Select(hour =>
            Booking.Reconstitute(hour, 1, "dr-kowalski",
                new TimeSlot(Tomorrow, new TimeOnly(hour, 0), new TimeOnly(hour + 1, 0)),
                BookingStatus.Upcoming)
        ).ToArray();
        var service = BuildService(bookingRepo: new FakeBookingRepository(bookings));

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.Empty(result);
    }

    [Fact]
    public void GetAvailableSlots_SlotsStartAtWorkdayStart()
    {
        var service = BuildService();

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.Equal(new TimeOnly(8, 0), result.First().Start);
    }

    [Fact]
    public void GetAvailableSlots_LastSlotEndsAtWorkdayEnd()
    {
        var service = BuildService();

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.Equal(new TimeOnly(20, 0), result.Last().End);
    }

    [Fact]
    public void GetAvailableSlots_30MinDuration_ReturnsDoubleTheSlots()
    {
        var service = BuildService();

        var result = service.GetAvailableSlots(1, Tomorrow, 30);

        // 8:00–20:00 = 24 sloty po 30 min, minus 2 dla przerwy technicznej = 22
        Assert.Equal(22, result.Count);
    }

    [Fact]
    public void GetAvailableSlots_BookingInMiddleOfDay_SplitsAvailability()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(12, 0), new TimeOnly(13, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAvailableSlots(1, Tomorrow, 60);

        Assert.Contains(result,    s => s.Start == new TimeOnly(11, 0));
        Assert.Contains(result,    s => s.Start == new TimeOnly(14, 0));
        Assert.DoesNotContain(result, s => s.Start == new TimeOnly(12, 0));
        Assert.DoesNotContain(result, s => s.Start == new TimeOnly(13, 0));
    }

    [Fact]
    public void GetAvailableSlots_SlotDurationLongerThanWorkday_ReturnsEmptyList()
    {
        var service = BuildService();

        var result = service.GetAvailableSlots(1, Tomorrow, 660);

        Assert.Empty(result);
    }

    // ── GetAllBookingsForDate ─────────────────────────────────────────────────

    [Fact]
    public void GetAllBookingsForDate_NoBookingsOnDate_ReturnsEmptyList()
    {
        var service = BuildService();

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetAllBookingsForDate_ReturnsAllBookingsRegardlessOfRoom()
    {
        var roomRepo = new FakeRoomRepository(
            ActiveRoom,
            new Room { Id = 2, Name = "Room 202", Type = "Surgery", Floor = 2, IsActive = true });
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 2, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo, roomRepo: roomRepo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void GetAllBookingsForDate_ReturnsAllBookingsRegardlessOfDoctor()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void GetAllBookingsForDate_IncludesAllStatuses()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0),  new TimeOnly(9, 0)),  BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(9, 0),  new TimeOnly(10, 0)), BookingStatus.Active),
            Booking.Reconstitute(3, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0)), BookingStatus.Completed),
            Booking.Reconstitute(4, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0)), BookingStatus.Cancelled));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Equal(4, result.Count);
    }

    [Fact]
    public void GetAllBookingsForDate_DoesNotReturnBookingsFromOtherDates()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Empty(result);
    }

    [Fact]
    public void GetAllBookingsForDate_ReturnsSortedByStartTime()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow, new TimeOnly(12, 0), new TimeOnly(13, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow, new TimeOnly(8, 0),  new TimeOnly(9, 0)),  BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Equal(new TimeOnly(8, 0),  result[0].StartTime);
        Assert.Equal(new TimeOnly(12, 0), result[1].StartTime);
    }

    [Fact]
    public void GetAllBookingsForDate_TodayDate_ReturnsBookingsForToday()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Today, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Active));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Today);

        Assert.Single(result);
    }

    [Fact]
    public void GetAllBookingsForDate_PastDate_ReturnsHistoricalBookings()
    {
        var yesterday = Today.AddDays(-1);
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(yesterday, new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Completed));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(yesterday);

        Assert.Single(result);
        Assert.Equal(BookingStatus.Completed, result[0].Status);
    }

    [Fact]
    public void GetAllBookingsForDate_ManyDates_ReturnsOnlyRequestedDate()
    {
        var repo = new FakeBookingRepository(
            Booking.Reconstitute(1, 1, "dr-kowalski", new TimeSlot(Tomorrow,              new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(2, 1, "dr-nowak",    new TimeSlot(Tomorrow.AddDays(1),   new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming),
            Booking.Reconstitute(3, 1, "dr-nowak",    new TimeSlot(Tomorrow.AddDays(2),   new TimeOnly(9, 0), new TimeOnly(10, 0)), BookingStatus.Upcoming));
        var service = BuildService(bookingRepo: repo);

        var result = service.GetAllBookingsForDate(Tomorrow);

        Assert.Single(result);
        Assert.Equal(1, result[0].Id);
    }
}
