using CodeLive.Api.Hubs;
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

builder.Services.AddSignalR();
builder.Services.AddSingleton<IRoomService, InMemoryRoomService>();

builder.Services.Configure<Judge0Options>(builder.Configuration.GetSection("Judge0"));
builder.Services.AddHttpClient<ICodeExecutionService, Judge0ExecutionService>((sp, http) =>
{
    var opt = builder.Configuration.GetSection("Judge0").Get<Judge0Options>() ?? new();
    http.BaseAddress = new Uri(opt.BaseUrl.TrimEnd('/') + "/");
    http.Timeout = TimeSpan.FromSeconds(opt.TimeoutSeconds);
    if (!string.IsNullOrWhiteSpace(opt.ApiKey))
        http.DefaultRequestHeaders.Add("X-Auth-Token", opt.ApiKey);
});

var app = builder.Build();
app.UseCors(CorsPolicy);
app.MapGet("/", () => Results.Ok(new { name = "CodeLive API", status = "ok" }));
app.MapHub<CollaborationHub>("/hubs/collaboration");

app.Run();
