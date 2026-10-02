using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace CodeLive.Api.Middleware;

public class YjsWebSocketMiddleware(RequestDelegate next, ILogger<YjsWebSocketMiddleware> logger)
{
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<WebSocket, byte>> Rooms = new();

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/ws/yjs") && context.WebSockets.IsWebSocketRequest)
        {
            var ws = await context.WebSockets.AcceptWebSocketAsync();
            var roomId = context.Request.Query["room"].ToString().Trim();
            if (string.IsNullOrEmpty(roomId))
            {
                var segs = context.Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
                if (segs?.Length >= 3) roomId = segs[2];
            }
            if (string.IsNullOrEmpty(roomId)) roomId = "default";

            var sockets = Rooms.GetOrAdd(roomId, _ => new ConcurrentDictionary<WebSocket, byte>());
            sockets.TryAdd(ws, 0);

            var buffer = new byte[64 * 1024];
            try
            {
                while (ws.State == WebSocketState.Open)
                {
                    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Close) break;

                    foreach (var (target, _) in sockets)
                    {
                        if (target != ws && target.State == WebSocketState.Open)
                        {
                            await target.SendAsync(new ArraySegment<byte>(buffer, 0, result.Count),
                                result.MessageType, result.EndOfMessage, CancellationToken.None);
                        }
                    }
                }
            }
            finally
            {
                sockets.TryRemove(ws, out _);
                if (sockets.IsEmpty) Rooms.TryRemove(roomId, out _);
            }
            return;
        }
        await next(context);
    }
}
