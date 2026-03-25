using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediBooker.Server.Models;
using Microsoft.IdentityModel.Tokens;

namespace MediBooker.Server.Services;

public class AuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _config;

    public AuthService(IUserRepository userRepo, IConfiguration config)
    {
        _userRepo = userRepo;
        _config = config;
    }

    public LoginResponse Register(RegisterRequest request)
    {
        if (_userRepo.FindByUsername(request.Username) is not null)
            throw new InvalidOperationException("Username already taken.");

        var doctorId = request.Username;
        var user = new User
        {
            Id           = _userRepo.NextId(),
            Username     = request.Username,
            PasswordHash = InMemoryUserRepository.HashPassword(request.Password),
            Role         = request.Role,
            DoctorId     = doctorId,
            DisplayName  = request.DisplayName,
        };

        _userRepo.Add(user);
        return BuildResponse(user);
    }

    public LoginResponse Login(LoginRequest request)
    {
        var user = _userRepo.FindByUsername(request.Username)
            ?? throw new UnauthorizedAccessException("Invalid username or password.");

        var hash = InMemoryUserRepository.HashPassword(request.Password);
        if (user.PasswordHash != hash)
            throw new UnauthorizedAccessException("Invalid username or password.");

        return BuildResponse(user);
    }

    private LoginResponse BuildResponse(User user)
        => new(GenerateJwtToken(user), user.DoctorId, user.DisplayName, user.Role);

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.DoctorId),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("displayName", user.DisplayName),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
