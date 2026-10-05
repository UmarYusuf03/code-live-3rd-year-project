using CodeLive.Api.Hubs;
using CodeLive.Api.Middleware;
using CodeLive.Api.Models;
using CodeLive.Api.Services;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"];

builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

builder.Services.AddSignalR(o =>
{
    o.MaximumReceiveMessageSize = 256 * 1024;
    o.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

builder.Services.AddSingleton<IRoomService, InMemoryRoomService>();

builder.Services.Configure<Judge0Options>(builder.Configuration.GetSection("Judge0"));
builder.Services.AddHttpClient<ICodeExecutionService, Judge0ExecutionService>((sp, client) =>
{
    var opts = sp.GetRequiredService<IOptions<Judge0Options>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
    if (!string.IsNullOrWhiteSpace(opts.ApiKey))
        client.DefaultRequestHeaders.Add("X-Auth-Token", opts.ApiKey);
});

var app = builder.Build();

app.UseCors(CorsPolicy);
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });

// Yjs CRDT relay: ws://host/ws/yjs?room={roomId}
app.Map("/ws/yjs", ws => ws.UseMiddleware<YjsWebSocketMiddleware>());

app.MapHub<CollaborationHub>("/hubs/collaboration");

app.MapGet("/", () => Results.Ok(new { name = "CodeLive API", status = "ok" }));
app.MapPost("/api/execute", (CodeExecutionRequest req, ICodeExecutionService exec, CancellationToken ct) => exec.ExecuteAsync(req, ct));

app.Run();

