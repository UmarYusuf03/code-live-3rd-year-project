using System.Buffers;
using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace CodeLive.Api.Middleware;

public class YjsWebSocketMiddleware(RequestDelegate next, ILogger<YjsWebSocketMiddleware> logger)
{
    private const int MaxMessageBytes = 8 * 1024 * 1024;

    private sealed class Client(WebSocket socket)
    {
        public WebSocket Socket { get; } = socket;
        public SemaphoreSlim SendLock { get; } = new(1, 1);
    }

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Client>> Rooms = new(StringComparer.OrdinalIgnoreCase);

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            if (next is not null) context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var roomId = (context.Request.Query["room"].ToString() ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(roomId)) roomId = (context.Request.Path.Value?.Trim('/') ?? "").ToLowerInvariant();

        if (string.IsNullOrEmpty(roomId) || roomId.Length > 64)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var socket = await context.WebSockets.AcceptWebSocketAsync();
        var id = Guid.NewGuid();
        var client = new Client(socket);
        var peers = Rooms.GetOrAdd(roomId, _ => new());
        peers[id] = client;

        try
        {
            var buffer = ArrayPool<byte>.Shared.Rent(16 * 1024);
            using var message = new MemoryStream();
            while (client.Socket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
            {
                var result = await client.Socket.ReceiveAsync(buffer, context.RequestAborted);
                if (result.MessageType == WebSocketMessageType.Close) break;

                message.Write(buffer, 0, result.Count);
                if (!result.EndOfMessage) continue;

                if (result.MessageType == WebSocketMessageType.Binary)
                {
                    var payload = message.ToArray();
                    var tasks = peers.Where(p => p.Key != id && p.Value.Socket.State == WebSocketState.Open)
                                     .Select(p => p.Value.Socket.SendAsync(payload, WebSocketMessageType.Binary, true, CancellationToken.None));
                    await Task.WhenAll(tasks);
                }
                message.SetLength(0);
            }
        }
        catch { }
        finally
        {
            peers.TryRemove(id, out _);
        }
    }
}
