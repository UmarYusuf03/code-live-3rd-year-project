using CodeLive.Api.Models;
using CodeLive.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"];

builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

builder.Services.AddSingleton<IRoomService, InMemoryRoomService>();

var app = builder.Build();
app.UseCors(CorsPolicy);
app.MapGet("/", () => Results.Ok(new { name = "CodeLive API", status = "ok" }));

app.Run();
