using MediBooker.Server.Models;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediBooker.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = _authService.Register(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = _authService.Login(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
