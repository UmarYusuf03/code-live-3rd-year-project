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
app.MapGet("/", () => Results.Ok(new { name = "CodeLive API", status = "ok" }));
app.MapPost("/api/execute", (CodeExecutionRequest req, ICodeExecutionService exec, CancellationToken ct) => exec.ExecuteAsync(req, ct));

app.Run();
