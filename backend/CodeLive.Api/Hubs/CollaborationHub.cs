using CodeLive.Api.Models;
using CodeLive.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace CodeLive.Api.Hubs;

public class CollaborationHub(IRoomService rooms, ICodeExecutionService executor, ILogger<CollaborationHub> logger) : Hub
{
    public async Task JoinRoom(string roomId, string name, string role)
    {
        roomId = (roomId ?? "").Trim().ToLowerInvariant();
        if (roomId.Length is 0 or > 64) throw new HubException("Invalid room id.");
        name = string.IsNullOrWhiteSpace(name) ? "Anonymous" : name.Trim()[..Math.Min(name.Trim().Length, 40)];

        var normalizedRole = Roles.Normalize(role);
        var user = new User
        {
            ConnectionId = Context.ConnectionId,
            Name = name,
            Role = normalizedRole,
            CanEdit = normalizedRole == Roles.Lecturer,
        };

        var room = rooms.AddUser(roomId, user);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        logger.LogInformation("{Name} ({Role}) joined room {Room}", name, normalizedRole, roomId);

        var participants = rooms.GetParticipants(roomId);
        await Clients.Caller.SendAsync("RoomState", new RoomStateDto(roomId, room.GlobalEdit, participants, user));
        await Clients.Group(roomId).SendAsync("ParticipantsUpdated", participants);
    }
}
