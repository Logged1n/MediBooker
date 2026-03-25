using System.Text;
using MediBooker.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<IBookingRepository, InMemoryBookingRepository>();
builder.Services.AddSingleton<IRoomRepository, InMemoryRoomRepository>();
builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"]!;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        };
    });

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(p =>
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseDefaultFiles();
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();
