using System.Buffers;
using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace CodeLive.Api.Middleware;

/// <summary>
/// Binary relay for the y-websocket protocol. Every complete binary message received from
/// one client is forwarded verbatim to all other clients in the same room. Yjs peers handle
/// sync (SyncStep1/2, updates, awareness) themselves, so the server stays stateless.
/// </summary>
public class YjsWebSocketMiddleware(RequestDelegate next, ILogger<YjsWebSocketMiddleware> logger)
{
    private const int MaxMessageBytes = 8 * 1024 * 1024;

    private sealed class Client(WebSocket socket)
    {
        public WebSocket Socket { get; } = socket;
        public SemaphoreSlim SendLock { get; } = new(1, 1);
    }

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Client>> Rooms = new();

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            if (next is not null) { context.Response.StatusCode = StatusCodes.Status400BadRequest; }
            return;
        }

        var roomId = context.Request.Query["room"].ToString().Trim();
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
        logger.LogDebug("Yjs client {Id} joined {Room} ({Count} peers)", id, roomId, peers.Count);

        try
        {
            await ReceiveLoop(client, id, roomId, context.RequestAborted);
        }
        catch (Exception ex) when (ex is WebSocketException or OperationCanceledException)
        {
            // client went away
        }
        finally
        {
            peers.TryRemove(id, out _);
            if (peers.IsEmpty) Rooms.TryRemove(new KeyValuePair<string, ConcurrentDictionary<Guid, Client>>(roomId, peers));
            if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                try { await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None); } catch { }
            }
        }
    }

    private async Task ReceiveLoop(Client client, Guid id, string roomId, CancellationToken ct)
    {
        var buffer = ArrayPool<byte>.Shared.Rent(16 * 1024);
        using var message = new MemoryStream();
        try
        {
            while (client.Socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await client.Socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) break;

                message.Write(buffer, 0, result.Count);
                if (message.Length > MaxMessageBytes)
                {
                    await client.Socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "too big", ct);
                    break;
                }
                if (!result.EndOfMessage) continue;

                if (result.MessageType == WebSocketMessageType.Binary)
                    await Broadcast(roomId, id, message.ToArray());
                message.SetLength(0);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private async Task Broadcast(string roomId, Guid senderId, byte[] payload)
    {
        if (!Rooms.TryGetValue(roomId, out var peers)) return;
        var tasks = peers.Where(p => p.Key != senderId).Select(p => SendSafe(p.Value, payload));
        await Task.WhenAll(tasks);
    }

    private async Task SendSafe(Client client, byte[] payload)
    {
        if (client.Socket.State != WebSocketState.Open) return;
        await client.SendLock.WaitAsync();
        try
        {
            await client.Socket.SendAsync(payload, WebSocketMessageType.Binary, true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Failed to relay Yjs frame");
        }
        finally
        {
            client.SendLock.Release();
        }
    }
}

